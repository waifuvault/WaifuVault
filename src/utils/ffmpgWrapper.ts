import ffmpeg from "fluent-ffmpeg";
import { ffmpegPath, ffprobePath } from "ffmpeg-ffprobe-static";
import { $log } from "@tsed/logger";

ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath as string);

const formats = await getFfmpegSupportedVideoFormats();

export function isFormatSupportedByFfmpeg(format: string): boolean {
    return formats.includes(format) || (format === "mkv" && formats.includes("matroska"));
}
function getFfmpegSupportedVideoFormats(): Promise<string[]> {
    return new Promise(resolve => {
        ffmpeg.getAvailableFormats((err, formats) => {
            if (err) {
                $log.error(err);
                resolve([]);
            } else {
                resolve(Object.keys(formats));
            }
        });
    });
}

export default ffmpeg;
