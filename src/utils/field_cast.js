function getStringField(formData, field) {
  const value = formData.get(field);
  if (typeof value !== "string") {
    throw new Error(
      `Expected string for field "${field}", got ${typeof value}`,
    );
  }
  return value;
}

export default getStringField; 