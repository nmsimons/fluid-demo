// custom hook to update the view when tree state changes
import { useEffect, useState } from "react";
import { Tree } from "fluid-framework";
import { TreeNode } from "@fluidframework/tree/alpha";

export function useTree(node: TreeNode, deep: boolean = false): number {
	const [inval, setInval] = useState(0);

	useEffect(() => {
		const unsubscribe = Tree.on(node, deep ? "treeChanged" : "nodeChanged", () => {
			setInval((prev) => prev + 1);
		});
		return unsubscribe;
	}, [node, deep]);

	return inval;
}

let counter = 0;
const idMap = new WeakMap<object, number>();
/**
 * Associates a unique number with an object.
 * @remarks
 * The id number is tied to the object identity, not the objects contents: modifying the object will not cause it to get a different id.
 *
 * This can be handy for generating [keys for React lists](https://react.dev/learn/rendering-lists#where-to-get-your-key) from TreeNodes.
 *
 * Most cases which could use this functions should just use the objects themselves instead of getting ids from them, since the objects will have the same equality as the ids.
 * For example if storing data associated with the objects in a map, using the object as the key is more efficient than getting an id from it and using that.
 * This functions exists to deal with the edge case where you would like to use object identity, but you can't.
 * React keys are an examples of such a case, since React does not allow objects as keys.
 */
export function objectIdNumber(object: object): number {
	const id = idMap.get(object);
	if (id !== undefined) {
		return id;
	}
	counter++;
	idMap.set(object, counter);
	return counter;
}
