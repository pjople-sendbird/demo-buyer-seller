
var sb;
var mGroupChannel;
var mChannelList = [];

function connect() {
    var appId = document.getElementById('appId').value;
    var userId = document.getElementById('userId').value;
    var accessToken = document.getElementById('accessToken').value;
    if (!appId || !userId) {
        return;
    }
    sb = new SendBird({ appId});
    sb.connect(userId, accessToken, (user, error) => {
        if (error) {
            toggleInfo('infoLogin', error, true);
        } else {
            toggleInfo('infoLogin', '', false);
            console.log(user);
            toggleVisibility('divConnection', false)
            toggleVisibility('divNewItemPurchased', true)
            listenForEvents();
            listMyChannels();
        }
    })
}


function listenForEvents() {
    var channelHandler = new sb.ChannelHandler();
    channelHandler.onMessageReceived = (channel, message) => {
        console.log('New message arrived');
        console.log(message)
        mGroupChannel = channel;
        loadMessageList();
    };
    channelHandler.onChannelChanged = (channel) => {
        console.log('Changes in the channel');
        console.log(channel);
        listMyChannels();
    };
    channelHandler.onChannelFrozen = (channel) => {
        console.log('Channel frozen');
        console.log(channel);
    };
    channelHandler.onChannelUnfrozen = (channel) => {
        console.log('Channel unfrozen');
        console.log(channel);
    };
    sb.addChannelHandler('UNIQUE_HANDLER_ID', channelHandler);
    console.log('Listening for events...');
}


function listMyChannels() {
    var listQuery = sb.GroupChannel.createMyGroupChannelListQuery();
    listQuery.includeEmpty = true;
    listQuery.memberStateFilter = 'joined_only';
    listQuery.order = 'latest_last_message';
    listQuery.limit = 15;
    if (listQuery.hasNext) {
        listQuery.next(function(groupChannels, error) {
            if (error) {
                alert(error)
            } else {
                mChannelList = groupChannels;
                drawMyChannels();
            }
        })
    }
}

function drawMyChannels() {
    let out = `<ul class="list-group">`;
    for (let ch of mChannelList) {
        const active = mGroupChannel && ch.url == mGroupChannel.url ? 'active' : '';
        out += `<li class="list-group-item pointer ${ active }" onClick="selectChannel('${ ch.url }')">${ ch.name }</li>`;
    }
    out += `</ul>`;
    var ele = document.getElementById('divChannelList')
    if (ele) {
        ele.innerHTML = out;
    }
    toggleVisibility('divChannelList', true);
}


function selectChannel(url) {
    mGroupChannel = mChannelList.find(i => i.url == url);
    drawMyChannels();
    toggleVisibility('divConversation', true);
    loadMessageList();
}



function createGroupChannelAndInvite() {
    var params = new sb.GroupChannelParams();
    params.name = 'New purchase on ' + new Date().toLocaleDateString();
    params.addUserIds(['seller', 'buyer']);
    params.operatorUserIds = ['buyer'];
    params.distinct = true;
    sb.GroupChannel.createChannel(params, function(groupChannel, error) {
        if (error) {
            alert(error);
        } else {
            mGroupChannel = groupChannel;
            toggleVisibility('divNewItemPurchased', false)
            toggleVisibility('divConversation', true)
        }
    })
}


function sendMessage() {
    var message = document.getElementById('message');
    if (!message.value || !mGroupChannel) {
        return;
    }
    const params = new sb.UserMessageParams();
    params.message = message.value;
    mGroupChannel.sendUserMessage(params, (userMessage, error) => {
        if (error) {
            toggleInfo('infoMessages', error, true);
        } else {
            addThisMessageToTheList(userMessage);
            toggleInfo('infoMessages', '', false);
            message.value = '';
        }
    })
}


function loadMessageList() {
    var ele = document.getElementById('divMessageList');
    ele.innerHTML = '';
    var listQuery = mGroupChannel.createPreviousMessageListQuery();
    listQuery.limit = 50;
    listQuery.reverse = true;
    listQuery.load((messages, error) => {
        if (error) {
            alert(error);
        } else {
            for (let msg of messages) {
                addThisMessageToTheList(msg);   
            }    
        }
    })
}


function addThisMessageToTheList(message) {
    var ele = document.getElementById('divMessageList');
    var out = `
        <div class="card m-2">
            <div class="card-body">
                ${ message.message }
            </div>
            <div class="card-footer">
                ${ message.sender ? message.sender.userId : 'System message' }
            </div>
        </div>
    `;
    ele.innerHTML += out;
}


function toggleFrozenChannel(freeze) {
    if (freeze) {
        mGroupChannel.freeze((response, error) => {
            if (error) {
                alert(error);
            } else {
                toggleInfo('infoMessages', 'Channel is now frozen. No conversations are allowed');
                toggleVisibility('butFreeze', false);
                toggleVisibility('butUnFreeze', true);
                document.getElementById('message').disabled = true;
                document.getElementById('butSendMessage').disabled = true;
            }
        })
    } else {
        mGroupChannel.unfreeze((response, error) => {
            if (error) {
                alert(error);
            } else {
                toggleInfo('infoMessages', 'Channel is availabe to chat');
                toggleVisibility('butUnFreeze', false);
                toggleVisibility('butFreeze', true);
                document.getElementById('message').disabled = false;
                document.getElementById('butSendMessage').disabled = false;
            }
        })
    }
}

function toggleBlockSeller(block) {
    if (mGroupChannel) {
        const user = mGroupChannel.members.find(i => i.userId == 'seller');
        if (!user) {
            console.log('Seller not found');
            return;
        }
        if (block) {
            blockUser(user, () => {
                toggleVisibility('butBlockUser', false);
                toggleVisibility('butUnBlockUser', true);
            })    
        } else {
            unblockUser(user, () => {
                toggleVisibility('butBlockUser', true);
                toggleVisibility('butUnBlockUser', false);
            })    
        }    
    } 
}


function blockUser(user, callback) {
    mGroupChannel.muteUser(user, 8700, 'Seller under investigation', (user, error) => {
        if (error) {
            alert(error)
        } else {
            callback();
        }
    })
}

function unblockUser(user, callback) {
    mGroupChannel.unmuteUser(user, (user, error) => {
        if (error) {
            alert(error)
        } else {
            callback();
        }
    })
}


function toggleVisibility(id, show) {
    var ele = document.getElementById(id);
    if (!ele) {
        return;
    }
    if (show) {
        ele.classList.remove('d-none');
    } else {
        ele.classList.add('d-none');
    }
}

function toggleInfo(id, message, show) {
    var ele = document.getElementById(id);
    ele.innerHTML = message;
    toggleVisibility(id, show);
}