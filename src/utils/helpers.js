function parseStringArray(stringArray) {
  try {
    if (!stringArray || stringArray === "") return [];

    return JSON.parse(stringArray);
  } catch (error) {
    console.error("Error parsing string array:", error);

    if (stringArray.startsWith("[") && stringArray.endsWith("]")) {
      const content = stringArray.substring(1, stringArray.length - 1).trim();
      if (!content) return [];

      return content.split(",").map((item) => {
        const trimmed = item.trim();
        const num = Number(trimmed);
        return isNaN(num) ? trimmed : num;
      });
    }
    return [stringArray];
  }
}

export { parseStringArray }; 