
import { Construct } from '@aws-cdk/core';
import { ClusterAddOn, ClusterInfo } from '../spi';

/**
 * Returns AddOn Id if defined else returns the class name
 * @param addOn
 * @returns string
 */
export function getAddOnNameOrId(addOn: ClusterAddOn): string {
  return addOn.id ?? addOn.constructor.name;
}

/**
 * Decorator function that accepts a list of AddOns and
 * ensures addons are scheduled to be added as well as
 * add them as dependencies
 * @param addOns 
 * @returns 
 */
export function dependable(...addOns: string[]) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function( ...args: any[]) {
      const dependencies = Array<Promise<Construct>>();
      const clusterInfo: ClusterInfo = args[0];
      const stack = clusterInfo.cluster.stack.stackName;

      addOns.forEach( (addOn) => {
        const dep = clusterInfo.getScheduledAddOn(addOn);
        console.assert(dep, `Missing a dependency for ${addOn} for ${stack}`);
        dependencies.push(dep!);
      });

      const result: Promise<Construct> = originalMethod.apply(this, args);

      Promise.all(dependencies.values()).then((constructs) => {
        constructs.forEach((construct) => {
            result.then((resource) => {
              resource.node.addDependency(construct);
            });
        });
      }).catch(err => { throw new Error(err) });

      return result;
    };

    return descriptor;
  };
}