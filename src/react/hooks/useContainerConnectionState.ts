import { useEffect, useState } from "react";
import { ConnectionState, IFluidContainer } from "fluid-framework";

function mapConnectionState(state: ConnectionState): string {
	if (state === ConnectionState.Connected) {
		return "connected";
	}
	if (state === ConnectionState.Disconnected) {
		return "disconnected";
	}
	if (state === ConnectionState.CatchingUp) {
		return "catching up";
	}
	return "connecting";
}

export function useContainerConnectionState(container: IFluidContainer): {
	connectionState: string;
	saved: boolean;
} {
	const [connectionState, setConnectionState] = useState<string>(() =>
		mapConnectionState(container.connectionState)
	);
	const [saved, setSaved] = useState<boolean>(() => !container.isDirty);

	useEffect(() => {
		const updateConnectionState = () => {
			setConnectionState(mapConnectionState(container.connectionState));
		};

		const handleDirty = () => setSaved(false);
		const handleSaved = () => setSaved(true);

		updateConnectionState();
		setSaved(!container.isDirty);

		container.on("connected", updateConnectionState);
		container.on("disconnected", updateConnectionState);
		container.on("disposed", updateConnectionState);
		container.on("dirty", handleDirty);
		container.on("saved", handleSaved);

		return () => {
			container.off("connected", updateConnectionState);
			container.off("disconnected", updateConnectionState);
			container.off("disposed", updateConnectionState);
			container.off("dirty", handleDirty);
			container.off("saved", handleSaved);
		};
	}, [container]);

	return { connectionState, saved };
}
