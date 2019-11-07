// eslint-disable-next-line no-undef
const xhr = new XMLHttpRequest();
const cycle = 30 * 1000;

const updateToken = () => {
  xhr.onloadend = () => {
    // eslint-disable-next-line no-console
    if (xhr.status === 200) console.log('token updated');
  };

  xhr.open('POST', '/refresh', false);
  xhr.send();
};

setInterval(updateToken, cycle, cycle);
