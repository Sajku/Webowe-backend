import cors from 'cors';
import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import webpush from 'web-push';

const adapter = new JSONFile('db.json');
const db = new Low(adapter);

const vapidDetails = {
    publicKey: "BEY_lf7UsoVHunFKq9QiuID2rtEMvzTttrFughPSxC-wu5ip4PBAhSmXLonwHEa7hTQLuyCLF1Q76967h8StEIY",
    privateKey: "RYFnpQE35R3NvTdJ_501z0U3HD-8OCx377AP-4ngpMg",
    subject: "mailto: abc@abc.com"
};


await db.read();
db.data ||= { subscriptions: [], users: [], groups: [] }
await db.write();

const app = express();
app.use(cors({
    origin: '*'
}));
app.use(express.json());

function sendNotifications(subscriptions, customTitle, customContent) {
    // Create the notification content.
    const notificationPayload = {
        "notification": {
            "title": customTitle,
            "body": customContent,
            "data": {
                "dateOfArrival": Date.now(),
                "primaryKey": 1
            }
        }
    };
    // Customize how the push service should attempt to deliver the push message.
    // And provide authentication information.
    const options = {
        TTL: 10000,
        vapidDetails: vapidDetails
    };
    // Send a push message to each client specified in the subscriptions array.
    subscriptions.forEach(subscription => {
        const endpoint = subscription.endpoint;
        webpush.sendNotification(subscription, JSON.stringify(notificationPayload), options)
            .then(result => {
                console.log(`Endpoint: ${endpoint}`);
                console.log(`Result: ${result.statusCode}`);
            })
            .catch(error => {
                console.log(`Endpoint: ${endpoint}`);
                console.log(`Error: ${error} `);
            });
    });
}

app.post('/add-subscription', async (request, response) => {
    db.data.subscriptions.push({ sub: request.body.subscription, userId: request.body.userId });
    await db.write();
    response.sendStatus(200);
});

app.post('/notify-one', (req, res) => {
    const subscriptions = db.data.subscriptions;
    let tempSubscriptions = [];
    for (let subscription of subscriptions) {
        if (req.body.userId == subscription.userId) {
            tempSubscriptions.push(subscription.sub);
        }
    }

    sendNotifications(tempSubscriptions, req.body.title, req.body.content);
    res.sendStatus(200);
});

app.post('/notify-all', (req, res) => {
    const groups = db.data.groups;
    for (let group of groups) {
        if (group.id == req.body.groupId) {
            let groupUsersIds = [];
            for (let participant of group.participants) {
                if (participant.accepted == true) {
                    groupUsersIds.push(participant.userId);
                }
            }

            const subscriptions = db.data.subscriptions;
            let tempSubscriptions = [];
            for (let subscription of subscriptions) {
                if (groupUsersIds.includes(subscription.userId)) {
                    tempSubscriptions.push(subscription.sub);
                }
            }

            sendNotifications(tempSubscriptions, req.body.title, req.body.content);
            res.sendStatus(200);
        }
    }
});

const listener = app.listen(process.env.PORT || 4000, () => {
    console.log(`Listening on port ${listener.address().port}`);
});





app.post('/register', async (req, res) => {
    let tempId = Math.round(Math.floor(Math.random() * 1000) * Math.floor(Math.random() * 77) / Math.floor(Math.random() * 88) + Math.floor(Math.random() * 1000000) - Math.floor(Math.random() * 10000));
    db.data.users.push({
        id: tempId,
        name: req.body.name,
        lastname: req.body.lastname,
        login: req.body.login,
        password: req.body.password
    });
    await db.write();
    res.json(tempId);
});

app.get('/login', async (req, res) => {
    let login = req.query.l;
    let pass = req.query.p;
    let found = false;
    const users = db.data.users;
    for (let user of users) {
        if (user.login == login && user.password == pass) {
            let temp = user.id;
            res.json(temp);
            found = true;
        }
    }
    if (!found) {
        res.json(-1);
    }
});

app.get('/users', async (req, res) => {
    const users = db.data.users;
    res.json(users);
});

app.post('/groups', async (req, res) => {
    let tempId = Math.round(Math.floor(Math.random() * 1000) * Math.floor(Math.random() * 90) / Math.floor(Math.random() * 55) + Math.floor(Math.random() * 1000000) - Math.floor(Math.random() * 10000));
    let groups = db.data.groups;
    for (let group of groups) {
        if (group.name == req.body.name) {
            res.json(-1);
            return 0;
        }
    }

    db.data.groups.push({
        id: tempId,
        name: req.body.name,
        participants: [],
        authorId: req.body.authorId
    });
    await db.write();
    res.json(tempId);
});

app.get('/groups', async (req, res) => {
    const groups = db.data.groups;
    res.json(groups);
});

app.post('/groups-participants', async (req, res) => {
    let groups = db.data.groups;
    for (let group of groups) {
        if (group.id == req.body.groupId) {
            group.participants.push({
                userId: req.body.userId,
                accepted: false,
                rejected: false
            });
        }
    }

    await db.write();
    res.sendStatus(200);
});

app.post('/groups-participants-accept', async (req, res) => {
    let groups = db.data.groups;
    for (let group of groups) {
        if (group.id == req.body.groupId) {
            for (let participant of group.participants) {
                if (participant.userId == req.body.userId) {
                    participant.accepted = true;
                }
            }
        }
    }

    await db.write();
    res.sendStatus(200);
});

app.post('/groups-participants-reject', async (req, res) => {
    let groups = db.data.groups;
    for (let group of groups) {
        if (group.id == req.body.groupId) {
            for (let participant of group.participants) {
                if (participant.userId == req.body.userId) {
                    participant.rejected = true;
                }
            }
        }
    }

    await db.write();
    res.sendStatus(200);
});