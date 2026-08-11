function CountingAnagrams(str) {

  const varOcg = str.split(" ");
  const varPcb = {};
  let varFiltersCg = 0;

  for (const word of varOcg) {

    const sortedWord = word.split("").sort().join("");

    if (!varPcb[sortedWord]) {
      varPcb[sortedWord] = [];
    }

    if (
      varPcb[sortedWord].length > 0 &&
      !varPcb[sortedWord].includes(word)
    ) {
      varFiltersCg++;
    }

    varPcb[sortedWord].push(word);
  }

  return varFiltersCg;
}

console.log(CountingAnagrams(readline()));