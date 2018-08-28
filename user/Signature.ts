/*
 * Created 2018 by Mike Fahl.
 */

import { Script, ScriptEnv } from "system_lib/Script";
import { resource } from "system_lib/Metadata";
import { SimpleFile } from "system/SimpleFile";
import { WebRenderer } from "system/WebRenderer";

export class Signature extends Script {

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

		return SimpleFile.move(
			src,
			dest,
			true
		).then(() => {
			return WebRenderer.render(
				compositeBlockUrl,
				"Composite.png",
				1920,
				1080,
				0,
				true
			);
		});
	}

}
