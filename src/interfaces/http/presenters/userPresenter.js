'use strict';

const publicUser = (u) => ({id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt});

const presentRegistered = (user) => ({message: 'User registered successfully', user: publicUser(user)});
const presentLoggedIn = ({token, user}) => ({token, user: publicUser(user)});
const presentCurrentUser = (user) => ({user: publicUser(user)});

module.exports = {presentRegistered, presentLoggedIn, presentCurrentUser};
