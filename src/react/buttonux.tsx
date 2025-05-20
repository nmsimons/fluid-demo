import { Tooltip, ToolbarButton } from "@fluentui/react-components";
import React, { JSX } from "react";

export function TooltipButton(props: {
	onClick: (e: React.MouseEvent) => void;
	children?: React.ReactNode;
	icon: JSX.Element;
	tooltip?: string;
	disabled?: boolean;
}): JSX.Element {
	const { children, tooltip } = props;
	return (
		<Tooltip content={tooltip ?? "No Tooltip Provided"} relationship="description">
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
