import React from "react";
import { auth } from "@/auth";
import { findCharacterByUuid } from "@/models/character";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { findUserByUuid } from "@/models/user";
import { toImageUrl } from "@/lib/r2-utils";
import { parseCharacterModules } from "@/types/oc";
import {
  Document,
  Page,
  Text,
  StyleSheet,
  Image,
  renderToBuffer,
} from "@react-pdf/renderer";

export const runtime = "nodejs";

type FormatType = "profile" | "summary";
type TemplateType = "modern" | "classic" | "print";
type LocaleType = "en" | "ja";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    paddingBottom: 64,
    fontSize: 12,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 6,
  },
  text: {
    marginBottom: 4,
  },
  muted: {
    color: "#6b7280",
  },
  logo: {
    position: "absolute",
    left: 24,
    bottom: 24,
    width: 64,
    height: 64,
  },
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.uuid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { uuid } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "profile") as FormatType;
    const template = (searchParams.get("template") || "modern") as TemplateType;
    const locale = (searchParams.get("locale") || "en") as LocaleType;

    if (!["profile", "summary"].includes(format)) {
      return new Response("Invalid format parameter", { status: 400 });
    }
    if (!["modern", "classic", "print"].includes(template)) {
      return new Response("Invalid template parameter", { status: 400 });
    }
    if (!["en", "ja"].includes(locale)) {
      return new Response("Invalid locale parameter", { status: 400 });
    }

    const character = await findCharacterByUuid(uuid);
    if (!character) {
      return new Response("Character not found", { status: 404 });
    }
    if (character.user_uuid !== session.user.uuid) {
      return new Response("Access denied", { status: 403 });
    }

    const creator = await findUserByUuid(character.user_uuid);
    const modules = parseCharacterModules(character.modules);
    const avatarUrl = await resolveCharacterAvatarUrl(character);
    const logoUrl = "https://artworks.anividai.com/assets/logo.png";

    const pdfBuffer = await renderToBuffer(
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>
            {character.name || (locale === "en" ? "Character Profile" : "キャラクタープロフィール")}
          </Text>
          {avatarUrl ? <Image style={styles.avatar} src={avatarUrl} /> : null}
          <Text style={styles.text}>
            {locale === "en" ? "Template" : "テンプレート"}: {template}
          </Text>
          <Text style={styles.text}>
            {locale === "en" ? "Format" : "形式"}: {format}
          </Text>

          <Text style={styles.sectionTitle}>
            {locale === "en" ? "Basic Information" : "基本情報"}
          </Text>
          <Text style={styles.text}>
            {locale === "en" ? "Gender" : "性別"}: {character.gender || "-"}
          </Text>
          <Text style={styles.text}>
            {locale === "en" ? "Age" : "年齢"}: {character.age || "-"}
          </Text>
          <Text style={styles.text}>
            {locale === "en" ? "Species" : "種族"}: {character.species || "-"}
          </Text>
          <Text style={styles.text}>
            {locale === "en" ? "Role" : "職業"}: {character.role || "-"}
          </Text>

          {format === "profile" ? (
            <>
              <Text style={styles.sectionTitle}>
                {locale === "en" ? "Brief Introduction" : "概要"}
              </Text>
              <Text style={styles.text}>
                {character.brief_introduction || "-"}
              </Text>

              <Text style={styles.sectionTitle}>
                {locale === "en" ? "Appearance" : "外見"}
              </Text>
              <Text style={styles.text}>
                {locale === "en" ? "Hair Color" : "髪色"}: {modules?.appearance?.hair_color || "-"}
              </Text>
              <Text style={styles.text}>
                {locale === "en" ? "Eye Color" : "瞳色"}: {modules?.appearance?.eye_color || "-"}
              </Text>

              <Text style={styles.sectionTitle}>
                {locale === "en" ? "Personality" : "性格"}
              </Text>
              <Text style={styles.text}>
                {modules?.personality?.greeting || "-"}
              </Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>
            {locale === "en" ? "Creator Information" : "クリエイター情報"}
          </Text>
          <Text style={styles.text}>
            {locale === "en" ? "Creator" : "クリエイター"}:{" "}
            {creator?.display_name || (locale === "en" ? "Anonymous" : "匿名")}
          </Text>
          <Text style={[styles.text, styles.muted]}>
            UUID: {character.uuid}
          </Text>
          <Image style={styles.logo} src={logoUrl} />
        </Page>
      </Document>
    );

    const filename = `${character.name.replace(/[^a-zA-Z0-9]/g, "_")}_${format}.pdf`;
    const pdfBytes = new Uint8Array(pdfBuffer);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("PDF export failed:", error);
    return new Response("Failed to export PDF", { status: 500 });
  }
}

async function resolveCharacterAvatarUrl(character: any): Promise<string | null> {
  const avatarUuid = character?.avatar_generation_image_uuid;
  if (!avatarUuid) return null;
  const avatarImage = await findGenerationImageByUuid(avatarUuid);
  if (!avatarImage) return null;
  const selectedUrl =
    avatarImage.thumbnail_detail ||
    avatarImage.thumbnail_desktop ||
    avatarImage.thumbnail_mobile ||
    avatarImage.image_url;
  return selectedUrl ? toImageUrl(selectedUrl) : null;
}
