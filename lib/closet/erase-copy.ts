/** User-facing outcomes of erasing an original. Kept out of the "use server" actions file, which may export only async functions. */
export const ERASE_FAILED = "Couldn't erase the photo. Nothing was changed — try again.";
export const ERASE_NO_CUTOUT =
  "This photo can't be erased here: the piece has no cut-out to show in its place. Write to legal@fitcheck.space and we'll delete it.";
export const ERASE_ALREADY = "This photo was already erased.";
export const DELETE_FAILED = "Couldn't delete the piece. Nothing was changed — try again.";
export const DELETE_NOT_REMOVED = "Remove this piece from your closet first, then delete it from Removed pieces.";
