import ffmpeg from "fluent-ffmpeg";
import { ffmpegPath, ffprobePath } from "ffmpeg-ffprobe-static";
import { $log } from "@tsed/common";

ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath as string);

const formats = await getFfmpegSupportedVideoFormats();

export function isFormatSupportedByFfmpeg(format: string): boolean {
    return formats.includes(format);
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
