/*
 * Created 2018 by Max Fahl.
 */

import { Script, ScriptEnv } from "system_lib/Script";
import { resource } from "system_lib/Metadata";
import { SimpleFile } from "system/SimpleFile";
import { WebRenderer } from "system/WebRenderer";
import { WATCHOUT } from "../system/WATCHOUT";

// noinspection JSUnusedGlobalSymbols
export class Signature extends Script {

	private moveRenderPromise: Promise<any>;
	private allCompleteResolve: (value?: (Thenable<any> | any)) => void;

	public constructor(env: ScriptEnv) {
		super(env);
		console.log("Signature instantiated");
	}

	@resource()
	public render(data: { tempPath: string }): any {
		const { tempPath } = data;
		const src = "/temp/" + tempPath;
		const dest = "/public/block/Main/Signature/media/image.png";
		const compositeBlockUrl = "http://localhost:9080/spot/index.ftl?noConn=1&transparent=1&preview=1&block=" + encodeURI("Main/CompleteSignature");

		WATCHOUT['qatar'].stop('Signatures');
		this.moveRenderPromise = SimpleFile.move(
			src,
			dest,
			true
		).then(() => {
			return WebRenderer.render(
				compositeBlockUrl,
				"new.png",
				1920,
				1080,
				0,
				true
			);
		});

		return new Promise((resolve) => {
			this.allCompleteResolve = resolve;
			SimpleFile.delete('/public/WebRenderer/30.png').then(
				this.lastDeleted.bind(this),
				this.lastDeleted.bind(this)
			);
		});
	}

	private lastDeleted(): void {
		this.renameImage(29);
	}

	private renameImage(imageNum: number): any {
		if (imageNum === 0) {
			this.moveRenderPromise.then(() => {
				SimpleFile.move(
					`/public/WebRenderer/new.png`,
					`/public/WebRenderer/1.png`,
				).then(() => {
					this.allDone();
				});
			});
		} else {
			SimpleFile.move(
				`/public/WebRenderer/${ imageNum }.png`,
				`/public/WebRenderer/${ imageNum + 1 }.png`,
				true
			).then(
				this.renameImage.bind(this, imageNum - 1),
				this.renameImage.bind(this, imageNum - 1)
			);
		}
	}

	private allDone(): void {
		WATCHOUT['qatar'].play('Signatures');
		this.allCompleteResolve({ success: true });
	}
}
