"use client";

interface AdListItemProps {
  id: string;
  title: string;
  hasImages: boolean;
  onImageClick?: () => void;
}

export default function AdListItem({
  id,
  title,
  hasImages,
  onImageClick,
}: AdListItemProps) {
  return (
    <li className="flex items-center gap-2">
      <a
        href={`/ad/${id}`}
        className="text-blue-600 hover:underline"
      >
        {title}
      </a>

      {hasImages && onImageClick && (
        <button
          type="button"
          title="This ad contains images"
          className="text-gray-500"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("IMAGE ICON CLICKED");
            onImageClick();
          }}
        >
          📷
        </button>

      )}
    </li>
  );
}
