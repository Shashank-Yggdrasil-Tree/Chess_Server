export const onlineList = []

export const addUserToOnlineList = (username) => {
    if (!onlineList.includes(username)) {
        onlineList.push(username)
    }
}

export const removeUserFromOnlineList = (username) => {
    const index = onlineList.indexOf(username)
    if (index !== -1) {
        onlineList.splice(index, 1)
    }
}
