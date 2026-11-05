import { api, ApiError } from "@/lib/api";
import { redirect } from "@/lib/router";

export type FormState = { error?: string; message?: string } | null;

const failure = (error: unknown): FormState => ({ error: error instanceof ApiError ? error.message : "Có lỗi xảy ra" });

export async function createDeck(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { slug } = await api.createDeck(String(form.get("name") ?? ""), String(form.get("slug") ?? "") || undefined);
    redirect(`/${slug}`);
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function saveCard(_: FormState, form: FormData): Promise<FormState> {
  const field = (name: string) => String(form.get(name) ?? "");
  try {
    const { slug, front } = await api.saveCard({
      deckId: Number(form.get("deckId")),
      cardId: form.get("cardId") ? Number(form.get("cardId")) : undefined,
      type: field("type"),
      front: field("front"),
      back: field("back"),
      ipa: field("ipa"),
      example: field("example"),
      exampleVi: field("exampleVi"),
      note: field("note"),
      tags: field("tags"),
    });
    if (form.get("next") === "again") return { message: `Đã thêm "${front}"` };
    redirect(`/${slug}`);
    return null;
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCard(cardId: number) {
  const { slug } = await api.deleteCard(cardId);
  redirect(`/${slug}`);
}

export async function importCards(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { message } = await api.importCards({
      deckId: Number(form.get("deckId")),
      type: String(form.get("type") ?? ""),
      tags: String(form.get("tags") ?? ""),
      text: String(form.get("text") ?? ""),
    });
    return { message };
  } catch (error) {
    return failure(error);
  }
}
