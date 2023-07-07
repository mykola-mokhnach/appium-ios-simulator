import { fs } from '@appium/support';
import { exec } from 'teen_process';
import path from 'path';
import _ from 'lodash';
import B from 'bluebird';
import SimulatorXcode14 from './simulator-xcode-14';

class SimulatorXcode15 extends SimulatorXcode14 {
  /**
   * Collects and caches bundle indetifier of system Simulator apps
   *
   * @returns {Promise<Set<string>>}
   */
  async _fetchSystemAppBundleIds () {
    if (this._systemAppBundleIds) {
      return this._systemAppBundleIds;
    }

    const appsRoot = path.resolve(await this.simctl.getEnv('IPHONE_SIMULATOR_ROOT'), 'Applications');
    const fetchBundleId = async (appRoot) => {
      const {stdout} = await exec('/usr/libexec/PlistBuddy', [
        '-c', 'print CFBundleIdentifier', path.resolve(appRoot, 'Info.plist')
      ]);
      return _.trim(stdout);
    };
    const allApps = (await fs.readdir(appsRoot))
      .filter((x) => x.endsWith('.app'))
      .map((x) => path.join(appsRoot, x));
    this._systemAppBundleIds = new Set(await B.all(allApps.map(fetchBundleId)));
    return this._systemAppBundleIds;
  }

  /**
   * Verify whether the particular application is installed on Simulator.
   * @override
   *
   * @param {string} bundleId - The bundle id of the application to be checked.
   * @return {Promise<boolean>} True if the given application is installed.
   */
  async isAppInstalled (bundleId) {
    try {
      const appContainer = await this.simctl.getAppContainer(bundleId);
      if (!appContainer.endsWith('.app')) {
        return false;
      }
      return await fs.exists(appContainer);
    } catch (err) {
      // get_app_container subcommand fails for system applications,
      // as well as the hidden appinfo command
      return (await this._fetchSystemAppBundleIds()).has(bundleId);
    }
  }

  /**
   * @override
   * @inheritdoc
   */
  async getLaunchDaemonsRoot () {
    return path.resolve(
      await this.simctl.getEnv('IPHONE_SIMULATOR_ROOT'),
      'System/Library/LaunchDaemons'
    );
  }
}

export default SimulatorXcode15;