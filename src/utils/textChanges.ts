import MagicString from "magic-string";

export enum ChangeAction {
	INSERT = "insert",
	REPLACE = "replace",
	DELETE = "delete",
}

export type ChangeSet = InsertChange | ReplaceChange | DeleteChange;

export interface AbstractChangeSet {
	action: ChangeAction;
	start: number;
}

export interface InsertChange extends AbstractChangeSet {
	action: ChangeAction.INSERT;
	value: string;
}

export interface ReplaceChange extends AbstractChangeSet {
	action: ChangeAction.REPLACE;
	end: number;
	value: string;
}

export interface DeleteChange extends AbstractChangeSet {
	action: ChangeAction.DELETE;
	end: number;
}

/**
 * Applies a set of changes to a string content.
 * Changes are applied in reverse order (by start position) to ensure that
 * positions remain valid as modifications are made.
 *
 * @param content The original string content to modify
 * @param changeSet Array of changes to apply
 * @returns The modified string content
 */
export function applyChanges(content: string, changeSet: ChangeSet[]): string {
	changeSet.sort((a, b) => b.start - a.start);
	const s = new MagicString(content);

	for (const change of changeSet) {
		switch (change.action) {
			case ChangeAction.INSERT:
				s.appendRight(change.start, change.value);
				break;
			case ChangeAction.REPLACE:
				s.update(change.start, change.end, change.value);
				break;
			case ChangeAction.DELETE:
				s.remove(change.start, change.end);
				break;
		}
	}
	return s.toString();
}
