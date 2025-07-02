import { Tooltip, ToolbarButton } from "@fluentui/react-components";
import React, { JSX } from "react";

export function TooltipButton(props: {
	onClick: (e: React.MouseEvent) => void;
	children?: React.ReactNode;
	icon: JSX.Element;
	tooltip?: string;
	keyboardShortcut?: string;
	disabled?: boolean;
}): JSX.Element {
	const { children, tooltip, keyboardShortcut } = props;

	// Format tooltip with keyboard shortcut if provided
	const tooltipContent = keyboardShortcut
		? `${tooltip ?? "No Tooltip Provided"} (${keyboardShortcut})`
		: (tooltip ?? "No Tooltip Provided");

	return (
		<Tooltip content={tooltipContent} relationship="description">
			<ToolbarButton {...props}>{children}</ToolbarButton>
		</Tooltip>
	);
}

export function IconButton(props: {
	onClick: (value: React.MouseEvent) => void;
	children?: React.ReactNode;
	icon: JSX.Element;
	disabled?: boolean;
}): JSX.Element {
	const { children } = props;
	return <ToolbarButton {...props}>{children}</ToolbarButton>;
}
