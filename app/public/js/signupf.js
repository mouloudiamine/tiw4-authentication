window.onload = () => {
  $('#validate').on('click', async (e) => {
    e.preventDefault();
    $('.errorDiv').remove();

    const obj = await createObject([
      'username',
      'email',
      'g-recaptcha-response'
    ]).catch((err) => console.log(err));
    const fetchObj = await createFetchObj(
      'post',
      { 'content-type': 'application/json' },
      JSON.stringify(obj)
    ).catch((err) => console.log(err));
    const errs = await fetch('/signup/confirm', fetchObj).then((res) =>
      res.json()
    );

    const mdpnconf = await createErr(
      'pw',
      checkPassword,
      'Le mot de passe doit contenir aux moins 8 caractères, un caractère majuscule',
      'mdpnconform'
    );
    if (mdpnconf != false) errs.mdpnconf = mdpnconf;

    const mailconf = await createErr(
      'email',
      checkEmail,
      "L'email n'est pas conforme",
      'emailnconforme'
    );
    if (mdpnconf != false) errs.mailconf = mailconf;

    const logvide = await createErr(
      'username',
      checkEmptyField,
      'Le login ne doit pas être vide',
      'loginvide'
    );
    if (logvide != false) errs.logvide = logvide;

    const mdp2 = await createErr(
      'pw2',
      checkEquivalance,
      'Les mots de passes ne se correspondent pas',
      'mdpcrpdpas',
      'pw'
    );
    if (mdp2 != false) errs.mdp2 = mdp2;

    if (Object.keys(errs).length == 0) $('#signup').submit();
    else {
      console.log('Affichage des élements');
      for (e in errs) {
        const element = errs[e];
        createErrDiv(element.msg, element.parent, element.id);
      }
    }
  });
};

async function checkEquivalance(id1, id2) {
  return new Promise((resolve, reject) => {
    $(`#${id1}`).val() == $(`#${id2}`).val() ? resolve() : reject();
  });
}

async function createErr(id, checkFun, msg, errid, id2) {
  let err = false;

  if (id2 != undefined) await checkFun(id, id2).catch(() => (err = true));
  else await checkFun(id).catch(() => (err = true));
  if (err) {
    return {
      id: errid,
      parent: id,
      msg
    };
  }
  return false;
}

function createFetchObj(method, headers, body) {
  return new Promise((resolve = (obj) => {
    return obj;
  }, reject) => {
    try {
      const fetchObj = {
        method,
        headers,
        body
      };
      resolve(fetchObj);
    } catch (e) {
      reject(e);
    }
  });
}

function createObject(ids) {
  return new Promise((resolve = (obj) => {
    return obj;
  }, reject) => {
    try {
      const obj = {};
      ids.forEach((id) => {
        obj[$(`#${id}`).attr('name')] = $(`#${id}`).val();
      });
      resolve(obj);
    } catch (e) {
      reject(e);
    }
  });
}

function createErrDiv(msg, parent, id, cl = 'errorDiv') {
  $(`#${parent}`).after(`<div class="${cl}" id="${id}">${msg}</div>`);
}

function deleteErrDiv(id) {
  $(`#${id}`).remove();
}

function checkEmptyField(id) {
  return new Promise((resolve, reject) => {
    $(`#${id}`).val().length == 0 ? reject() : resolve();
  });
}

function checkMaxLengthField(id) {}

function checkPassword(idpass) {
  return new Promise((resolve, reject) => {
    const password = $(`#${idpass}`).val();
    const strongRegex = new RegExp(
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})'
    );
    strongRegex.test(password) ? resolve() : reject();
  });
}

function checkEmail(idemail) {
  return new Promise((resolve, reject) => {
    const email = $(`#${idemail}`).val();
    const mailregex = new RegExp(
      '^([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+).([a-zA-Z]{2,6})$'
    );
    mailregex.test(email) ? resolve() : reject();
  });
}
