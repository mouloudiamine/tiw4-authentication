ALTER TABLE users alter column password TYPE varchar;

ALTER TABLE users ADD verified boolean default false;

CREATE TABLE usersTemp(cryptedCode character varying not null,userid integer not null references users(userid),creation_date timestamp default current_timestamp); 