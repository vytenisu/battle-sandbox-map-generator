export const times = (
  amount: number,
  cb: (index: number) => boolean | void,
): number => {
  for (let i = 0; i < amount; i++) {
    if (cb(i) === false) {
      return i
    }
  }

  return amount
}
