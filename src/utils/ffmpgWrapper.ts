import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegStatic as string);

const formats = await getFfmpegSupportedVideoFormats();

export function isFormatSupportedByFfmpeg(format: string): boolean {
    return formats.includes(format);
}

function getFfmpegSupportedVideoFormats(): Promise<string[]> {
    return new Promise(resolve => {
        ffmpeg.getAvailableFormats((err, formats) => {
            if (err) {
                console.error("Error fetching ffmpeg formats:", err);
                resolve([]);
            } else {
                resolve(Object.keys(formats));
            }
        });
    });
}

export default ffmpeg;
