const publicUserFields = [
    ['id', 'id'],
    ['username', 'username'],
    ['nickname', 'nickname'],
    ['bio', 'bio'],
    ['gender', 'gender'],
    ['birthdate', 'birthdate'],
];

export function toPublicUser(row) {
    return Object.fromEntries(publicUserFields
        .filter(([source]) => row[source] !== undefined)
        .map(([source, destination]) => [destination, row[source]]));
}

export function toPublicUsers(rows) {
    return rows.map(toPublicUser);
}

export const PUBLIC_USER_SQL_COLUMNS = [
    'u.id',
    'u.username',
    'u.nickname',
    'u.bio',
    'u.gender',
    'u.birthdate',
].join(', ');
