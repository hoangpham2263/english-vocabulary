# English Lab

Sổ học từ vựng cá nhân: học từ mới, ôn theo lịch lặp lại ngắt quãng và luyện tập. Một tài khoản, không có đăng ký.

**Trang:** https://hoangpham.is-a.dev/english-vocabulary/

## Cấu trúc

| Phần | Công nghệ | Chạy ở |
| --- | --- | --- |
| Giao diện (`src/`) | Vite, React, React Router, Tailwind | GitHub Pages |
| API (`worker/`) | Cloudflare Worker, Drizzle | `english-vocabulary-api.hoangpham2263.workers.dev` |
| Dữ liệu (`migrations/`) | Cloudflare D1 | Cloudflare |

Nội dung khoá học nằm ở repo riêng tư `english-vocabulary-sources`, clone vào thư mục `data/`. Không có `data/` thì app vẫn build và chạy test được, chỉ không nạp lại được nội dung.

## Chạy trên máy

Cần Node 24 và pnpm (`corepack enable`).

```sh
pnpm install
git clone git@github.com:hoangpham2263/english-vocabulary-sources.git data
cp .dev.vars.example .dev.vars   # rồi đặt giá trị của bạn
pnpm db:migrate:local
pnpm seed:local
pnpm dev:api    # API ở cổng 8787
pnpm dev        # http://localhost:5173/english-vocabulary/
```

Trước khi push, chạy `pnpm verify`.

## Triển khai

- **Giao diện:** push lên `main`, GitHub Actions build rồi đẩy sang nhánh `gh-pages`.
- **API:** `pnpm deploy:api`. Worker không tự triển khai từ Actions.
- **Đổi cấu trúc bảng:** sửa `worker/schema.ts`, chạy `pnpm db:generate` rồi `pnpm db:migrate:remote`.
- **Nạp lại nội dung:** `pnpm seed:remote`. Lệnh này chỉ cập nhật nội dung thẻ, không đụng lịch ôn.

## Tài khoản

Tên đăng nhập, mật khẩu và khoá ký phiên là secret của Worker. Đổi mật khẩu:

```sh
pnpm exec wrangler secret put ENGLISH_VOCABULARY_PASSWORD
```

Sai mật khẩu 10 lần thì khoá đăng nhập 15 phút. Đổi `ENGLISH_VOCABULARY_SESSION_SECRET` sẽ đăng xuất mọi thiết bị.

## Nguồn nội dung

Không đưa PDF, mp3 hay nội dung trích từ sách vào repo. Câu và đoạn văn lấy từ dữ liệu mở, nguồn và giấy phép ghi ở từng thẻ và cuối trang khoá học.
