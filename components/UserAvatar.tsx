/**
 * UserAvatar — shows the user's profile photo or a colored initial circle fallback.
 * Used in the Navbar and confirmation screens.
 */
export default function UserAvatar({
  image,
  name,
  size = "sm",
}: {
  image?: string | null;
  name?: string | null;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs";
  const initial = (name ?? "?").trim().slice(0, 1).toUpperCase();

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? ""}
        className={`${sizeClass} flex-shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex flex-shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-800`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
