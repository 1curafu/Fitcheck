/** User-facing outcomes of erasing an original. Kept out of the "use server" actions file, which may export only async functions. */
export const ERASE_FAILED = "Couldn't erase the photo. Nothing was changed — try again.";
export const ERASE_NO_CUTOUT = "This photo can't be erased: the piece has no cut-out to show in its place.";
export const ERASE_ALREADY = "This photo was already erased.";
