import { readDistributionLicenses } from './lib/distribution-licenses.mjs';

export function distributionLicenses() {
  return {
    name: 'office-distribution-licenses',
    async generateBundle() {
      for (const [fileName, source] of await readDistributionLicenses()) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
