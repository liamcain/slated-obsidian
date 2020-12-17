import RRule from 'rrule';

const repeatScheduleRe = /[;📅]\W*([a-zA-Z0-9\W]+)/;
const movedFromRe = /<\[\[([^\]]+)#\^[-a-zA-Z0-9]+(|[^\]]+)?\]\]/;
const movedToRe = />\[\[([^\]]+)\]\]/;
const repeatsFromRe = /<<\[\[([^\]]+)#\^[-a-zA-Z0-9]+(|[^\]]+)?\]\]/;
const blockHashRe = /\^([-a-zA-Z0-9]+)/;

export class TaskLine {
  public readonly lineNum: number;

  private readonly originalLine: string;
  private _line: string;
  private _modified: boolean;

  private _repeatConfig: string;
  private _blockID: string;
  private _movedToLink: string;
  private _movedToNoteName: string;
  private _movedFromLink: string;
  private _movedFromNoteName: string;
  private _repeatsFromLink: string;
  private _repeatsFromNoteName: string;

  private hasRepeatConfig: boolean;
  private repeatParseError: boolean;
  private _rrule: RRule | undefined;

  constructor(line: string, lineNum: number) {
    this.originalLine = line;
    this._line = line;
    this.lineNum = lineNum;

    const repeatMatches = repeatScheduleRe.exec(line);
    if (repeatMatches && repeatMatches.length === 2) {
      this.hasRepeatConfig = true;
      this._repeatConfig = repeatMatches[1];
      this._rrule = RRule.fromText(this._repeatConfig);
      this.repeatParseError = this._rrule === undefined;
    } else {
      this.hasRepeatConfig = false;
      this.repeatParseError = false;
    }

    const blockIDMatches = blockHashRe.exec(line);
    if (
      blockIDMatches &&
      blockIDMatches.length === 2 &&
      blockIDMatches[1] !== ''
    ) {
      this._blockID = blockIDMatches[1];
    } else {
      this._blockID = '';
    }

    const movedFromLink = movedFromRe.exec(line);
    if (movedFromLink) {
      this._movedFromLink = movedFromLink[0];
      if (movedFromLink.length > 1 && movedFromLink[1] !== '') {
        this._movedFromNoteName = movedFromLink[1].split('|')[0];
      }
    }

    const movedToLink = movedToRe.exec(line);
    if (movedToLink) {
      this._movedToLink = movedToLink[0];
      if (movedToLink.length > 1 && movedToLink[1] !== '') {
        this._movedToNoteName = movedToLink[1].split('|')[0];
      }
    }

    const repeatsFromLink = repeatsFromRe.exec(line);
    if (repeatsFromLink) {
      console.log(repeatsFromLink);
      this._repeatsFromLink = repeatsFromLink[0];
      if (repeatsFromLink.length > 1 && repeatsFromLink[1] !== '') {
        this._repeatsFromNoteName = repeatsFromLink[1].split('|')[0];
      }
    }

    if (this.hasRepeatConfig && !this._blockID) {
      this.addBlockID();
    }
  }

  /**
   * line returns the current (possibly modified) value of this task line.
   */
  public get line(): string {
    return this._line;
  }

  // isOriginalInstance indicates if this is the task actually annotated with a
  // block ID, or if instead it is referring to another task by blockID.
  public get isOriginalInstance(): boolean {
    throw new Error('Not implemented');
  }

  // Converts the line to be used in places where it was moved to another note.
  // Something like:
  // - [x] This is the task >[[2020-12-25]] ^task-abc123
  public lineAsMovedTo = (): string => {
    throw new Error('Not implemented');
  };

  // Converts the line to be used in places where it was moved from another note.
  // Something like:
  // - [ ] This is the task <[[2020-12-25^task-abc123]]
  public lineAsMovedFrom = (): string => {
    throw new Error('Not implemented');
  };

  public get movedTo(): string {
    return this._movedToNoteName || '';
  }

  public get movedFrom(): string {
    return this._movedFromNoteName || '';
  }

  public get repeatsFrom(): string {
    return this._repeatsFromNoteName || '';
  }

  /**
   * modified indicates if the line has been updated from the original value.
   * Modifications may include:
   * - Adding a block ID
   * - Adding a date that this task was moved to
   * - Checking or unchecking this task
   */
  public get modfied(): boolean {
    return this._modified;
  }

  public get blockID(): string {
    return this._blockID;
  }

  public get repeats(): boolean {
    return this.hasRepeatConfig;
  }

  public get repeatValid(): boolean {
    return !this.repeatParseError;
  }

  public get repeatConfig(): RRule {
    return this._rrule;
  }

  /**
   * Create a blockID and append to the line.
   */
  private readonly addBlockID = (): void => {
    if (this._blockID !== '') {
      return;
    }

    this._blockID = createTaskBlockHash();
    this._line += ' ^' + this._blockID;
    this._modified = true;
  };
}

const createTaskBlockHash = (): string => {
  // TODO: Should this be task-<timestamp> instead?
  //       Or make it user configurable?
  let result = 'task-';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};