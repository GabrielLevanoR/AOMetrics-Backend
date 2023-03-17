exports.convertStringDate = (dateString) => {
  let partesFecha = dateString.split(" at ")[0];
  let partsHour = dateString.split(" at ")[1];

  let date = new Date(partesFecha);

  let hour = parseInt(partsHour.split(":")[0]);
  let min = parseInt(partsHour.split(":")[1]);
  let sec = 0;

  if (partsHour.indexOf("PM") !== -1 && hour !== 12) {
    hour += 12;
  } else if (partsHour.indexOf("AM") !== -1 && hour === 12) {
    hour = 0;
  }

  let fechaHora = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    min,
    sec
  );

  return fechaHora.getTime();
};
