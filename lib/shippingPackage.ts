import type { BtcPostageDimensions, BtcPostagePackageType } from '@/lib/btcPostage';
import { getBtcPostageConfig } from '@/lib/btcPostage';

export interface PackageProfile {
  packageType: BtcPostagePackageType;
  dimensions: BtcPostageDimensions;
}

export function estimateOrderWeightOz(itemCount: number): number {
  const baseOz = 8;
  const perItemOz = 4;
  return Math.min(70 * 16, baseOz + Math.max(1, itemCount) * perItemOz);
}

export function weightOzToLbsOz(totalOz: number): Pick<BtcPostageDimensions, 'weightLbs' | 'weightOz'> {
  const safeOz = Math.max(1, totalOz);
  const weightLbs = Math.floor(safeOz / 16);
  const weightOz = Number((safeOz % 16).toFixed(2));
  return { weightLbs, weightOz };
}

export function getDefaultPackageProfile(itemCount = 1): PackageProfile {
  const config = getBtcPostageConfig();
  const totalOz = estimateOrderWeightOz(itemCount);
  const split = weightOzToLbsOz(totalOz);

  return {
    packageType: config.defaultPackageType,
    dimensions: {
      ...config.defaultDimensions,
      weightLbs: split.weightLbs,
      weightOz: split.weightOz,
    },
  };
}