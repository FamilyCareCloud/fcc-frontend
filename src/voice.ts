// Mic recording helpers for the assistant voice question (POST /groups/{g}/assistant/voice).
export const AUDIO_MAX_BYTES = 4 * 1024 * 1024;

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("오디오를 읽지 못했습니다."));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export type Recorder = {
  stop: () => Promise<{ blob: Blob; mimeType: string }>;
  cancel: () => void;
};

export async function startRecording(): Promise<Recorder> {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
    throw new Error("이 브라우저에서는 음성 녹음을 지원하지 않습니다.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopTracks = () => stream.getTracks().forEach((t) => t.stop());
  recorder.start();
  return {
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onerror = () => {
          stopTracks();
          reject(new Error("녹음 중 오류가 발생했습니다."));
        };
        recorder.onstop = () => {
          stopTracks();
          resolve({ blob: new Blob(chunks, { type: mimeType ?? recorder.mimeType }), mimeType: mimeType ?? recorder.mimeType });
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.onstop = null;
      recorder.stop();
      stopTracks();
    },
  };
}
