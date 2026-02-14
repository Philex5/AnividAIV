import worldTypes from "@/configs/worlds/world-types.json";

export function getWorldGenreLabel(
  genre: string | null | undefined,
  t: (key: string) => string,
) {
  if (!genre) return "";
  const preset = worldTypes.find((item) => item.id === genre);
  if (preset) {
    return t(`${preset.id}.name`);
  }
  return genre;
}
