import React from "react";
import { FileReferenceCard, FileReferenceEntry } from "../../../schema/appSchema.js";
import { useTree } from "../../hooks/useTree.js";

interface FileReferenceCardViewProps {
	card: FileReferenceCard;
}

const CARD_WIDTH_PX = 320;

function isValidUrl(url: string): boolean {
	if (!url) {
		return false;
	}
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

interface ReferenceRowProps {
	entry: FileReferenceEntry;
	isEditing: boolean;
	onToggleEditing: (entryId: string) => void;
	onRemove: (entryId: string) => void;
}

function ReferenceRow(props: ReferenceRowProps): JSX.Element {
	const { entry, isEditing, onToggleEditing, onRemove } = props;
	useTree(entry);

	const displayTitle = entry.title.trim() || "Untitled reference";
	const urlValue = entry.url.trim();
	const urlIsValid = isValidUrl(urlValue);

	const handleAnchorPointerDown = (event: React.PointerEvent<HTMLAnchorElement>) => {
		event.stopPropagation();
	};

	const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (!urlIsValid) {
			event.preventDefault();
		}
	};

	const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		entry.title = event.target.value;
	};

	const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		entry.url = event.target.value;
	};

	const handleInputPointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
		event.stopPropagation();
	};

	const handleEditPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
		event.stopPropagation();
	};

	const handleEditClick = () => {
		onToggleEditing(entry.id);
	};

	const handleRemoveClick = () => {
		onRemove(entry.id);
	};

	return (
		<li className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 shadow-sm">
			<div className="flex items-center justify-between gap-2">
				<a
					href={urlIsValid ? urlValue : undefined}
					target="_blank"
					rel="noopener noreferrer"
					onPointerDown={handleAnchorPointerDown}
					onClick={handleAnchorClick}
					className={`text-sm font-medium ${urlIsValid ? "text-blue-600 hover:text-blue-700 hover:underline" : "cursor-default text-slate-500"}`}
				>
					{displayTitle}
				</a>
				<div className="flex gap-1">
					<button
						type="button"
						onPointerDown={handleEditPointerDown}
						onClick={handleEditClick}
						className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
					>
						{isEditing ? "Close" : "Edit"}
					</button>
					<button
						type="button"
						onPointerDown={handleEditPointerDown}
						onClick={handleRemoveClick}
						className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50"
					>
						Remove
					</button>
				</div>
			</div>
			{isEditing && (
				<div className="grid gap-2">
					<input
						type="text"
						value={entry.title}
						onChange={handleTitleChange}
						onPointerDown={handleInputPointerDown}
						placeholder="Reference title"
						className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
						autoComplete="off"
						data-item-editable
					/>
					<input
						type="url"
						value={entry.url}
						onChange={handleUrlChange}
						onPointerDown={handleInputPointerDown}
						placeholder="https://example.com/document"
						className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
						autoComplete="off"
						data-item-editable
					/>
				</div>
			)}
		</li>
	);
}

export function FileReferenceCardView(props: FileReferenceCardViewProps): JSX.Element {
	const { card } = props;
	useTree(card);
	useTree(card.references);

	const [editingId, setEditingId] = React.useState<string | null>(null);

	const handleAddReference = React.useCallback(() => {
		const entry = new FileReferenceEntry({
			id: crypto.randomUUID(),
			title: "Untitled reference",
			url: "",
		});
		card.references.insertAtEnd(entry);
		setEditingId(entry.id);
	}, [card.references]);

	const handleToggleEditing = React.useCallback((entryId: string) => {
		setEditingId((current) => (current === entryId ? null : entryId));
	}, []);

	const handleRemoveReference = React.useCallback(
		(entryId: string) => {
			const index = card.references.findIndex((entry) => entry.id === entryId);
			if (index === -1) {
				return;
			}
			card.references.removeAt(index);
			setEditingId((current) => (current === entryId ? null : current));
		},
		[card.references]
	);

	const references = React.useMemo(() => Array.from(card.references), [card.references]);

	return (
		<div
			className="flex w-[320px] max-w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
			style={{ width: `${CARD_WIDTH_PX}px` }}
		>
			<div className="flex flex-col gap-1">
				<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Reference Files
				</span>
				<p className="text-xs text-slate-500">
					Attach links that provide extra context for nearby LLM cards. Only the titles are shown on the
					canvas; clicking opens the source in a new tab.
				</p>
			</div>
			<ul className="flex flex-col gap-3">
				{references.length === 0 ? (
					<li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
						No references yet. Add links to share background files or documents with your LLM prompts.
					</li>
				) : (
					references.map((entry) => (
						<ReferenceRow
							key={entry.id}
							entry={entry}
							isEditing={editingId === entry.id}
							onToggleEditing={handleToggleEditing}
							onRemove={handleRemoveReference}
						/>
					))
				)}
			</ul>
			<button
				type="button"
				onClick={handleAddReference}
				onPointerDown={(event) => event.stopPropagation()}
				className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
			>
				Add reference
			</button>
		</div>
	);
}
