
import { InfoIcon } from "lucide-react";
import { useAccent } from "@/components/accent-provider";

// The chart is built on General American. When the learner listens in UK
// English, say plainly where British speech differs instead of pretending.
export function IpaAccentNote() {
  if (useAccent() !== "uk") return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-primary/30 bg-secondary p-4 text-sm">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary-edge" />
      <div className="space-y-1">
        <p className="font-semibold">Bảng này theo hệ âm giọng Mỹ. Giọng Anh (UK) khác ở mấy chỗ chính:</p>
        <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li>Không đọc âm r cuối hay trước phụ âm: car /kɑː/, bird /bɜːd/, teacher /ˈtiːtʃə/.</li>
          <li>Âm /ɒ/ ngắn, tròn môi cho hot, stop, job (giọng Mỹ là /ɑː/).</li>
          <li>Âm /əʊ/ thay cho /oʊ/: go /ɡəʊ/, home /həʊm/.</li>
          <li>Nguyên âm đôi /ɪə/, /eə/, /ʊə/ thay cho /ɪr/, /er/, /ʊr/: near, hair, tour.</li>
          <li>Nhiều từ dùng /ɑː/ thay cho /æ/: dance, ask, after, path.</li>
          <li>Âm t giữa hai nguyên âm vẫn đọc rõ là t: water /ˈwɔːtə/.</li>
        </ul>
        <p className="text-muted-foreground">Phiên âm từ vựng trong 6 book đã hiện theo giọng Anh.</p>
      </div>
    </div>
  );
}
