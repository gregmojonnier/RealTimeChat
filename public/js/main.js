$(document).ready(function() {
    // cookies used to track users logged in status client side
    var chatUserCookieName = '_chatUser';
    var chatUserCookieId = '_chatId';

    // page buttons at the top list items
    var registerLi = $("#register-li");
    var chatLi = $("#chat-li");

    configurePageBasedOnPath($(location).attr('pathname'));

    function configurePageBasedOnPath(path) {
        var cookies = getChatCookies();
        var isLoggedIn = cookies.id && cookies.name;

        if (path == "/") {
            if (isLoggedIn)
                window.location.replace('/chat');
            else
                registerLi.addClass("active");
                setIndexPageButtonListeners();
        } else if (path == "/chat") {
            if (isLoggedIn) {
                chatLi.addClass("active");
                chatIsReadyButtonState();
                addChatSpecificNavBarItems(cookies.name);
                setChatPageButtonListeners();
                setInterval(getLatestMessagesAndUsers, 5000);
            } else {
                window.location.replace('/');
            }
        }
    }

    function setIndexPageButtonListeners() {
        $("#join").click(function() {
            var user = $("#user").val();
            if (user) {
                $.post("/user", {'name': user}, function(res) {
                    var data = res;
                    $.cookie(chatUserCookieName, data.name);
                    $.cookie(chatUserCookieId, data.id);
                    window.location.replace('/chat');
                })
                .fail(function(res) {
                    alert("Unable to join chat at this time :(");
                });
            } else {
                alert("You must enter a name to chat!");
            }
        });
    }

    function setChatPageButtonListeners() {
        $("#send").click(function() {
            var message = $("#message-input").val();
            var userId = getChatCookies().id;
            $.post("/message", {'id': userId, message}, function(res) {
                window.location.replace('/chat');
            })
            .fail(function(res) {
                alert("Message send failure :(");
            });
        });

        $("#logout-li").click(function() {
            logUserOut();
        });
    }

    function addChatSpecificNavBarItems(userName) {
        var navUl = $("#nav-ul");
        navUl.append("<li id=\"logout-li\" role=\"presentation\" style=\"float:right\">" +
                                "<a id=\"logout-a\">Logout</a>" +
                     "</li>");
        navUl.append("<li class=\"disabled\" role=\"presentation\" style=\"float:right\"><a>Welcome " + userName + "!</a></li>");
    }

    function logUserOut() {
        var id = getChatCookies().id;
        $.removeCookie(chatUserCookieName);
        $.removeCookie(chatUserCookieId);
        $.post("/logout", {id}, function(res) {
            window.location.replace('/');
        })
    }

    function getChatCookies() {
        var id = $.cookie(chatUserCookieId);
        var name = $.cookie(chatUserCookieName);
        var cookies = {};
        if (id) {
            cookies.id = id;
        }
        if (name) {
            cookies.name = name;
        }
        return cookies;
    }

    function chatIsReadyButtonState() {
        chatLi.removeClass("disabled");
        registerLi.addClass("disabled");
        $("#register-a").removeAttr('href');
        $("#chat-a").attr('href', '/chat');
    }

    function getLatestMessagesAndUsers() {
        $.get("/messages", {id: getChatCookies().id})
            .done(function( data ) {
            var additionalMessages = "<h1>hi</h1>";
            var messages = data.messages;
            messages.forEach(function(message) {

                // helper function to update these nested divs
                function createDiv(content, classAttributes, style) {
                    var newDiv = "<div class=\"" + classAttributes + "\" style=\"" + style + "\">";
                    newDiv += content + "</div>";
                    return newDiv;
                }

                // construct the updated message divs
                var messageTime = new Date(message.time);
                messageTime = messageTime.getDate() + "/" + messageTime.getMonth() + " " + messageTime.getHours() + ":" + messageTime.getMinutes();
                var newMessageTimeDiv = createDiv(messageTime, "col-md-2", "");
                var newMessageNameDiv = createDiv(message.name, "col-md-2", "");
                var newMessageMessageDiv = createDiv(message.message, "col-md-8", "");
                var newMessageRowContent = newMessageTimeDiv + newMessageNameDiv + newMessageMessageDiv;

                var newMessageRowDiv = createDiv(newMessageRowContent, "row", "border: 2px solid;");
                $("#messages-col").append(newMessageRowDiv);
            });
        })
        .fail(function() {
            alert("Unable to get the latest messages :(");
        });
        
    }
});
