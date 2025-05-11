function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateExpiryDate(rotationPeriod, expired_at) {
  let expiryDate = new Date(expired_at);
  const expiredDate = new Date(expiryDate);

  switch (rotationPeriod) {
    case "1_week":
      expiryDate.setDate(expiredDate.getDate() + 7);
      break;
    case "2_week":
      expiryDate.setDate(expiredDate.getDate() + 14);
      break;
    case "1_month":
      expiryDate.setMonth(expiredDate.getMonth() + 1);
      break;
    case "3_month":
      expiryDate.setMonth(expiredDate.getMonth() + 3);
      break;
    case "6_month":
      expiryDate.setMonth(expiredDate.getMonth() + 6);
      break;
    case "1_year":
      expiryDate.setFullYear(expiredDate.getFullYear() + 1);
      break;
    default:
      expiryDate.setDate(expiredDate.getDate() + 7);
  }

  return formatDate(expiryDate);
}

export default calculateExpiryDate; 