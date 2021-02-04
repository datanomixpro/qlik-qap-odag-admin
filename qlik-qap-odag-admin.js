/*
 *    Fill in host and port for Qlik engine
 */
var prefix = window.location.pathname.substr( 0, window.location.pathname.toLowerCase().lastIndexOf( "/extensions" ) + 1 );

var config = {
    host: window.location.hostname,
    prefix: prefix,
    port: window.location.port,
    isSecure: window.location.protocol === "https:"
};
//to avoid errors in workbench: you can remove this when you have added an app

require.config( {
    baseUrl: (config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "" ) + config.prefix + "resources"
} );

require( ["js/qlik"], function ( qlik ) {
    var control = false;
    var app;

    function onError(error) {
        $( '#popupText' ).append( error + "<br>" );
        if ( !control ) {
            control = true;
            $( '#popup' ).delay( 1000 ).fadeIn( 1000 ).delay( 11000 ).fadeOut( 1000 );
        }
    }

    qlik.setOnError( function ( error ) {
        $( '#popupText' ).append( error.message + "<br>" );
        if ( !control ) {
            control = true;
            $( '#popup' ).delay( 1000 ).fadeIn( 1000 ).delay( 11000 ).fadeOut( 1000 );
        }
    } );

    $( "#closePopup" ).click( function () {
        $( '#popup' ).hide();
    } );


    /* ====================== Manually added ======================= */
    let cache = {};
    function refreshApp() {
        const $status = $(`#removeSelectedAppLinks-status`);
        const selectionAppId = $(`#selectionAppId`).val();
        const selectionAppSheetId = $(`#selectionAppSheetId`).val();

        if (!checkGUIDs(selectionAppId, selectionAppSheetId)) {
            return $status.text(`Check selectionAppId and selectionAppSheetId`);
        }

        app = qlik.openApp(selectionAppId, config);

        const selectionSheetFrame = document.getElementById('selectionSheetFrame');
        selectionSheetFrame.src = (config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "" ) + config.prefix + "single/" + `?appid=${selectionAppId}&sheet=${selectionAppSheetId}&opt=currsel%2Cctxmenu&select=clearall`;

        $(`.border-section`).addClass(`app-enabled`);

        app.getObject("AppNavigationBar", "AppNavigationBar", {
            sheetId: selectionAppSheetId,
            openAppCallback: function (appId, targetSheetId) {
                loadTemplateSheetToIframe(appId, targetSheetId);
                console.log("Generated app ID: " + appId + " and target sheetID is: " + targetSheetId);
                const appGenerated = qlik.openApp(appId, config);
                appGenerated.getObject('QV03','cLbPUvg');
                appGenerated.getObject('QV04','aDG');
            }
        });
    }

    $(`#btnRefresh`).click(refreshApp);

    /* ================================================ Common Functions ================================================ */
    const ODAGurl = `${window.location.protocol}//${config.host}${config.port ? ":" + config.port : "" }${config.prefix}api/odag/v1`;

    function loadTemplateSheetToIframe(appId, targetSheetId) {
        if (!targetSheetId) {
            targetSheetId = $(`#templateAppSheetId`).val();
        }
        const iframeHTML = document.getElementById('generatedIFrame');
        iframeHTML.src = (config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "" ) + config.prefix + "single/" + `?appid=${appId}&sheet=${targetSheetId}&opt=currsel%2Cctxmenu&select=clearall`;
    }

    function getHumanErrorMessage(error) {
        // Case Ajax error
        if (error.readyState) {
            const responseText = error.responseText;
            if (responseText.toLowerCase().startsWith(`<!doctype html>`)) {
                // Using statusText
                return `${error.statusText} (status: ${error.status})`;
            } else {
                return responseText;
            }
        }

        // Case Qlik JSON Engine WS error
        if (error.code) {
            return `${error.message} (param: ${error.parameter.toString()})`;
        }

        return error.toString ? error.toString() : `Unknown error`;
    }

    function checkGUIDs() {
        for (let i = 0; i < arguments.length; i++) {
            const arg = arguments[i];
            if (!arg) {
                return false;
            }
            if (!arg.trim().length || !IsGUID(arg)) {
                return false;
            }
        }
        return true;
    }

    function checkIDs() {
        for (let i = 0; i < arguments.length; i++) {
            const arg = arguments[i];
            if (!arg) {
                return false;
            }
            if (!arg.trim().length) {
                return false;
            }
        }
        return true;
    }

    function ajaxCall(data) {
        return new Promise((resolve, reject) => {
            const requestId = getRandomInt();
            data.success = function(result) {
                console.log(`Ajax success [${requestId}]`, result);
                return resolve(result);
            };
            data.error = function(jqXHR, status, thrown) {
                console.log(`Ajax error [${requestId}]`, jqXHR);
                return reject(jqXHR);
            };
            data.contentType= "application/json";

            if (typeof data.data === "object" && data.method === "post") {
                data.data = JSON.stringify(data.data);
            }
            console.log(`Ajax [${requestId}]`, data);
            $.ajax(data);
        });
    }

    function createSelAppLinkUsages(selectionAppId, linkId) {
        console.log(`createSelAppLinkUsages`, {selectionAppId, linkId});
        return ajaxCall({
            method: `post`,
            url: `${ODAGurl}/apps/${selectionAppId}/selAppLinkUsages`,
            data: {
                "linkList": [linkId]
            },
        });
    }

    function getRandomString(length) {
        let result           = '';
        let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let charactersLength = characters.length;
        for ( let i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    function getRandomInt() {
        return  Math.floor(Math.random()*900000) + 100000;
    }

    function IsGUID (string) {
        if (!string || !string.length) {
            return false;
        }
        let GUID = /[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/i;
        return GUID.test(string);
    }

    /* ================================================ Setup Application  ================================================ */
    const $templateAppSheetList = $(`#templateAppSheetId`);
    const $selectionAppSheetList = $(`#selectionAppSheetId`);

    function fetchAppSheets(appId) {
        return new Promise((resolve, reject) => {
            const appToFetch = qlik.openApp(appId, config);
            appToFetch.getAppObjectList(`sheet`, response => {
                if (response.error) {
                    return reject(response.error);
                }
                return resolve(response.qAppObjectList.qItems);
            });
        });
    }

    $(`#fetch-template-sheets`).click(function() {
        const $status = $(`#removeSelectedAppLinks-status`);
        const templateAppId = $(`#templateAppId`).val();

        $status.text(``);
        if (!checkGUIDs(templateAppId)) {
            return $status.text(`Enter template app ID first`);
        }

        $templateAppSheetList.html(`<option selected value="-1">Loading...</option>`);

        fetchAppSheets(templateAppId)
            .then(sheets => {
                if (!sheets.length) {
                    return $templateAppSheetList.html(`<option selected value="-1">No sheets</option>`);
                }
                $templateAppSheetList.html(``);
                sheets.forEach((sheet, index) => {
                    const selected = index === 0 ? "selected" : "";
                    $templateAppSheetList.append(`<option ${selected} value="${sheet.qInfo.qId}">${sheet.qMeta.title} (${sheet.qInfo.qId})</option>`);
                });
            })
            .catch(error => {
                return $status.text(`Error: ${getHumanErrorMessage(error)}`);
            })
    });

    $(`#fetch-selection-sheets`).click(function() {
        const $status = $(`#removeSelectedAppLinks-status`);
        const selectionAppId = $(`#selectionAppId`).val();

        $status.text(``);
        if (!checkGUIDs(selectionAppId)) {
            return $status.text(`Enter selection app ID first`);
        }

        $selectionAppSheetList.html(`<option selected value="-1">Loading...</option>`);

        fetchAppSheets(selectionAppId)
            .then(sheets => {
                if (!sheets.length) {
                    return $selectionAppSheetList.html(`<option selected value="-1">No sheets</option>`);
                }
                $selectionAppSheetList.html(``);
                sheets.forEach((sheet, index) => {
                    const selected = index === 0 ? "selected" : "";
                    $selectionAppSheetList.append(`<option ${selected} value="${sheet.qInfo.qId}">${sheet.qMeta.title} (${sheet.qInfo.qId})</option>`);
                });
            })
            .catch(error => {
                return $status.text(`Error: ${getHumanErrorMessage(error)}`);
            })
    });

    $(`#removeSelectedAppLinks`).click(function onClickDeleteLinks() {
        if (!window.confirm(`This will delete all ODAG Links for the application. Ar you sure?`)) {
            return;
        }
        const $status = $(`#removeSelectedAppLinks-status`);
        const selectionAppId = $(`#selectionAppId`).val();

        $status.text(``);
        if (!checkGUIDs(selectionAppId)) {
            $status.text(`Error: Invalid selectionAppId`);
        }

        const QRSurl = `${window.location.protocol}//${config.host}${config.port ? ":" + config.port : "" }${config.prefix}qrs`;
        $status.text(`Processing...`);
        const removeCache = {};
        return ajaxCall({
            method: "get",
            headers: {
                "x-Qlik-Xrfkey": "12345678qwertyui"
            },
            url: `${QRSurl}/odagrequest?Xrfkey=12345678qwertyui&filter=(selectionAppId eq '${selectionAppId}')`
        })
            .then(requests => {
                const appLinks = [];
                requests.forEach(request => {
                    if (request.link && appLinks.indexOf(request.link.id) === -1) {
                        appLinks.push(request.link.id);
                    }
                });
                removeCache.appLinks = appLinks;
                removeCache.removedLinks = [];

                return Promise.all(appLinks.map(appLinkId => {
                    return ajaxCall({
                        method: `delete`,
                        url: `${QRSurl}/odaglink/${appLinkId}?Xrfkey=12345678qwertyui`,
                        headers: {
                            "x-Qlik-Xrfkey": "12345678qwertyui"
                        }
                    })
                        .then(() => {
                            removeCache.removedLinks.push(appLinkId);
                            return Promise.resolve();
                        })
                        .catch(error => {
                            console.log(`error delete appLink ${appLinkId}`, error);
                            return Promise.resolve()
                        })
                }));
            })
            .then(() => {
                $status.text(`Deleting referenced odagapplink's from the app`);

                const wsURL = `${config.isSecure ? "wss://" : "ws://"}//${config.host}${config.prefix}app/${selectionAppId}`;
                return qsocks.Connect({connectionString: wsURL})
            })
            .then(global => {
                removeCache.global = global;
                console.log(`Open doc without data`);
                return global.openDoc(selectionAppId, '', '', '', true)
                    .catch(error => {
                        console.log(`Open doc with data`);
                        if (error.code === 1009) {
                            return global.openDoc(selectionAppId);
                        } else {
                            throw error;
                        }
                    });
            })
            .then(app => {
                removeCache.app = app;
                return app.getObjects(`odagapplink`);
            })
            .then(odagapplinkList => {
                removeCache.odagapplinksToRemove = [];
                // Go throw odagappLinks and check if their odagLink reference contains deleted odagLink
                odagapplinkList.forEach(odagapplink => {
                    if (removeCache.removedLinks.indexOf(odagapplink.qMeta.odagLinkRef) !== -1) {
                        removeCache.odagapplinksToRemove.push(odagapplink.qInfo.qId);
                    }
                });
                removeCache.removedOdagapplinksCount = removeCache.odagapplinksToRemove.length;
                return Promise.all(removeCache.odagapplinksToRemove.map(odagapplink => {
                    return removeCache.app.destroyObject(odagapplink)
                        .catch(error => {
                            removeCache.removedOdagapplinksCount -= 1;
                            console.log(`Error destroy odagapplink ${odagapplink}`, error);
                        });
                }));
            })
            .then(() => {
                $status.text(`Delete Links count: ${removeCache.removedLinks.length}, deleted odagapplinks count: ${removeCache.removedOdagapplinksCount}`);
            })
            .catch(error => {
                $status.text(`Error: ${getHumanErrorMessage(error)}. Deleted Links cout: ${removeCache.removedLinks.length}`);
            });
    });

    /* ================================================ Setup ODAG Link - create new or choose existing  ================================================ */
    const $linksList = $(`#chooseLink`);
    const $manualLink = $(`#manualLink`);
    let linkType = $(`input[name="useLinkType"]:checked`).val();

    $(`#linkName`).val(`mashup-odag-link-${getRandomInt()}`);

    function updateLinkToUseStatus() {
        const $status = $(`#activeLink-status`);
        switch (linkType) {
            case `create`:
                if (cache.link) {
                    $status.text(`Used lik: ${cache.link.name} (${cache.link.id})`);
                } else {
                    $status.text(`No link, please create new or choose existing.`);
                }
                break;
            case `fromList`:
                if (cache.link) {
                    $status.text(`Used lik from list: ${cache.link.name} (${cache.link.id})`);
                } else {
                    $status.text(`Please, select a link`);
                }
                break;
            case `input`:
                if (cache.link) {
                    $status.text(`Used lik from manual input: ${cache.link.name} (${cache.link.id})`);
                } else {
                    $status.text(`Please, enter a valid link ID`);
                }
                break;
        }
    }
    updateLinkToUseStatus();

    $(`input[name="useLinkType"]`).on(`change`, function() {
        linkType = $(this).val();
        delete cache.link;
        switch (linkType) {
            case `create`:
                // set previously created link
                cache.link = cache.createdLink;
                $('#btnCreateLink').removeAttr("disabled");
                updateLinkToUseStatus();
                break;
            case `fromList`:
                $('#btnCreateLink').attr("disabled", true);
                $linksList.trigger(`change`);
                break;
            case `input`:
                $('#btnCreateLink').attr("disabled", true);
                $manualLink.trigger(`keyup`);
                break;
        }
    });

    $manualLink.on(`keyup`, function() {
        if (linkType !== `input`) {
            return;
        }

        const val = $(this).val().trim();
        if (val.length === 0) {
            delete cache.link;
            return updateLinkToUseStatus();
        }

        cache.link = {id: val, name: 'Manually entered'};
        updateLinkToUseStatus();
    });

    $linksList.on("change", function() {
        if (linkType !== `fromList`) {
            return;
        }
        const value = $linksList.val();
        if (!value || value === "-1") {
            delete cache.link;
        } else {
            cache.link = cache.appLinks.find(link => link.id === value);
        }
        updateLinkToUseStatus();
    });

    $('#btnCreateLink').click(function createLink() {
        const $status = $(`#createLink-status`);
        $status.text(``);

        const streamID = $(`#linkStream`).val().trim();
        const selectionAppId = $(`#selectionAppId`).val();
        const templateAppId = $(`#templateAppId`).val().trim();
        const templateAppSheetId = $(`#templateAppSheetId`).val();

        if (!checkGUIDs(selectionAppId, templateAppId, streamID, templateAppSheetId)) {
            $status.text(`Check IDs`);
        }

        $status.text(`Creating link...`);
        const linkName = $(`#linkName`).val().trim() || `mashup-odag-link-${getRandomInt()}`;
        const json = {
            "name": linkName,
            "selectionApp": selectionAppId,
            "templateApp": templateAppId,
            "rowEstExpr": "1",
            "properties": {
                "rowEstRange": [
                    {
                        "context": "*",
                        "highBound": 10000000
                    }],
                "genAppLimit": [
                    {
                        "context": "User_*",
                        "limit": 50
                    }],
                "appRetentionTime": [
                    {
                        "context": "User_*",
                        "retentionTime": "unlimited"
                    }
                ],
                "publishTo": [{
                    context: "User_*",
                    streamId: streamID
                }],
                "targetSheet": [{
                    context: "User_*",
                    sheetId: templateAppSheetId
                }]
            }
        };
        console.log(`Create link: `, json);
        ajaxCall({
            method: "post",
            url: `${ODAGurl}/links`,
            data: json
        })
            .then(createdLink => {
                cache.link = createdLink.objectDef;
                cache.createdLink = createdLink.objectDef;
                $status.text(`Link created: ${cache.link.name} (${cache.link.id})`);
                updateLinkToUseStatus();
            })
            .catch(error => {
                $status.text(`Create Link error: ${getHumanErrorMessage(error)}`);
                updateLinkToUseStatus();
            });
    });

    $(`#link-fetch-links`).click(function() {
        const $status = $(`#fetchLinks-status`);
        $status.text(``);

        $linksList.html(`<option selected value="-1">Loading...</option>`);
        ajaxCall({
            method: "get",
            url: `${ODAGurl}/links`
        })
            .then(links => {
                cache.appLinks = links;
                $linksList.html(`<option selected value="-1">select a link</option>`);
                links.forEach(link => {
                    $linksList.append(`<option value="${link.id}">${link.name} (${link.id})</option>`);
                });
            })
            .catch(error => {
                $status.text(`Error: ${getHumanErrorMessage(error)}`);
            });
    });


    /* ================================================ Native ODAG UI  ================================================ */

    $(`#btnAddToNavBar`).click(function onClickAddToNavBar() {
        const $status = $(`#odagUi-status`);
        $status.text(``);

        if (!cache.link) {
            return $status.text(`Create a link first`);
        }

        const selectionAppId = $(`#selectionAppId`).val();
        const templateAppId = $(`#templateAppId`).val();
        const $navButtonTitle = $(`#navButtonTitle`);

        if (!checkGUIDs(selectionAppId, templateAppId)) {
            return $status.text(`Error: Invalid selectionAppId or templateAppId`);
        }

        const wsURL = `${config.isSecure ? "wss://" : "ws://"}//${config.host}${config.prefix}app/${selectionAppId}`;
        const qData = {};
        $status.text(`Processing...`);
        createSelAppLinkUsages(selectionAppId, cache.link.id)
            .then(()=> {
                return qsocks.Connect({connectionString: wsURL})
            })
            .then(global => {
                qData.global = global;
                console.log(`Open doc without data`);
                return global.openDoc(selectionAppId, '', '', '', true)
                    .catch(error => {
                        console.log(`Open doc with data`);
                        if (error.code === 1009) {
                            return global.openDoc(selectionAppId);
                        } else {
                            throw error;
                        }
                    });
            })
            .then(app => {
                $status.text(`Open Doc success, creating odagapplink object`);
                console.log(`Open Doc success, creating odagapplink`);
                qData.app = app;
                return app.createObject({
                    "qInfo": {
                        "qType": "odagapplink"
                    },
                    "qExtendsId": "",
                    "qMetaDef": {
                        "odagLinkRef": cache.link.id
                    },
                    "qStateName": ""
                });
            })
            .then(odagAppLink => {
                const selectionAppSheetId = $(`#selectionAppSheetId`).val();
                console.log(`odagapplink create success`);
                odagAppLink.getLayout().then(odagAppLinkLayout=> {
                    console.log(`Created odagapplink:`);
                    console.log(odagAppLinkLayout);
                });

                $status.text(`Applying changes to the sheet...`);
                return qData.app.getObject(selectionAppSheetId)
                    .then(handle => {
                        qData.handle = handle;
                        return handle.getFullPropertyTree();
                    })
            })
            .then(sheet => {
                const keepNavButtons = $(`#keepNavButtons`).is(':checked');
                qData.sheet = sheet;
                console.log(`Get sheet data success, adding navbar button`);
                console.log(sheet);
                if (!sheet.qProperty.navPoints) {
                    sheet.qProperty.navPoints = [];
                }
                const newNavPoint = {
                    "info": {
                        "id": getRandomString(6)
                    },
                    "odagLinkRefID": cache.link.id,
                    "title": $navButtonTitle.val() || `Generate`
                };
                if (keepNavButtons) {
                    sheet.qProperty.navPoints.push(newNavPoint);
                } else {
                    sheet.qProperty.navPoints = [newNavPoint];
                }

                return qData.handle.setFullPropertyTree(sheet);
            })
            .then(() => {
                console.log(`AddToNavBar success`);
                $status.text(`Success.`);
                refreshApp();
                qData.global && qData.global.connection && qData.global.connection.close();
            })
            .catch(error => {
                $status.text(`Error: ${getHumanErrorMessage(error)}`);
                console.log(`Add Button to Navigation Bar error:`, error);
                qData.global && qData.global.connection && qData.global.connection.close();
            })
    });


    /* ================================================ API ODAG Calls  ================================================ */
    function buildSelectionForRequest() {
        const selectionState = app.selectionState();
        const selections = selectionState.selections;
        const resultSelections = [];
        selections.forEach(appSelection => {
            const resultSelection = {
                "selectionAppParamType": "Field",
                "selectionAppParamName": appSelection.fieldName,
                "values": [],
                "selectedSize": appSelection.selectedCount
            };
            appSelection.selectedValues.forEach(appSelectionSelectedValue => {
                resultSelection.values.push({
                    "selStatus": "S",
                    "strValue": appSelectionSelectedValue.qName
                });
            });
            resultSelections.push(resultSelection);
        });
        return resultSelections;
    }

    $('#btnGenerate').click(function createRequest() {
        const $status = $("#apiOdag-status");
        $status.text(``);

        if (!cache.link) {
            $status.text('Generate App Error: Create or Choose a link first');
        }
        const selectionAppId = $(`#selectionAppId`).val();
        const templateAppId = $(`#templateAppId`).val();
        const selectionAppSheetId = $(`#selectionAppSheetId`).val();
        if (!checkGUIDs(selectionAppId, templateAppId, selectionAppSheetId)) {
            return $status.text(`Generate App Error: Invalid selectionAppId or templateAppId or selectionAppSheetId`);
        }

        const selection = buildSelectionForRequest();
        if (!selection.length) {
            return $status.text(`Generate App Error: Selection is empty, try Generate again`);
        }

        $status.text(`Processing Generate App`);
        createSelAppLinkUsages(selectionAppId, cache.link.id)
            .then(() => {
                return ajaxCall({
                    method: "post",
                    url: `${ODAGurl}/links/${cache.link.id}/requests`,
                    data: {
                        "selectionApp": selectionAppId,
                        "sheetname": selectionAppSheetId,
                        "actualRowEst": 1,
                        "bindSelectionState": selection,
                        "selectionState": selection
                    },
                });
            })
            .then(createdRequest => {
                $status.text(`Request Created, please check request state`);
                console.log("Request Created:", createdRequest);
                cache.request = createdRequest;
            })
            .catch(error => {
                $status.text(`Generate App Error: ${getHumanErrorMessage(error)}`);
                console.log(`Generate App Error`, error);
            })
    });

    $('#btnCheckState').click(function checkRequest() {
        const $status = $("#apiOdag-status");
        $status.text(``);

        if (!cache.request) {
            return $status.text(`Check State Error: Create a request first`);
        }

        $status.text(`Processing Check state...`);
        ajaxCall({
            method: "get",
            url: `${ODAGurl}/requests/${cache.request.id}`,
        })
            .then(request => {
                if (request.state === "succeeded") {
                    $status.html(`State: Success. Please, wait while view is loaded. <a href="${window.location.protocol}//${config.host}${config.prefix}sense/app/${request.generatedApp.id}">Open generated App</a>`);

                    loadTemplateSheetToIframe(request.generatedApp.id);
                    const appGenerated = qlik.openApp(request.generatedApp.id, config);
                    appGenerated.getObject('QV03','cLbPUvg');
                    appGenerated.getObject('QV04','aDG');

                } else {
                    $status.text(`State: ${request.state}. Try again in a few seconds.`);
                }
            })
            .catch(error => {
                $status.text(`Check State Error: ${getHumanErrorMessage(error)}`);
                console.log(`Check State Error:`, error);
            });
    });


    /* ================================================ Dynamic View Repair ================================================ */
    const dynamicRepairCache = {};

    function createDynamicViewOdagLink(selectionAppId, templateAppId) {
        console.log(`createDynamicViewOdagLink`, {selectionAppId, templateAppId});
        return ajaxCall({
            method: "post",
            url: `${ODAGurl}/links`,
            data: {
                "id": "",
                "name": `NewODAGLink-${getRandomString(6)}`,
                "templateApp": templateAppId,
                "rowEstExpr": "1",
                "privileges": [],
                "properties": {
                    "rowEstRange": [
                        {
                            "context": "*",
                            "highBound": 1
                        }
                    ]
                },
                "dynamicView": true,
                "selectionApp": selectionAppId
            }
        });
    }

    function initDynamicRepairQsocks(selectionAppId) {
        if (dynamicRepairCache.qsocks && dynamicRepairCache.qsocks.global
            && dynamicRepairCache.qsocks.app && dynamicRepairCache.qsocks.connection) {
            return Promise.resolve();
        }

        const wsURL = `${config.isSecure ? "wss://" : "ws://"}//${config.host}${config.prefix}app/${selectionAppId}`;
        console.log(`DynamicRepair Connecting to ws ${wsURL}`);
        return qsocks.Connect({connectionString: wsURL})
            .then(global => {
                console.log(`DynamicRepair WS connected`);
                dynamicRepairCache.qsocks = {};
                dynamicRepairCache.qsocks.global = global;
                console.log(`DynamicRepair Open doc without data`);
                return global.openDoc(selectionAppId, '', '', '', true)
                    .catch(error => {
                        console.log(`DynamicRepair Open doc with data`);
                        if (error.code === 1009) {
                            return global.openDoc(selectionAppId);
                        } else {
                            throw error;
                        }
                    });
            })
            .then(app => {
                console.log(`DynamicRepair Open doc success`);
                return dynamicRepairCache.qsocks.app = app;
            })
    }

    $(`#dynamicRepair-createLink`).click(function () {
        const $status = $(`#dynamicRepair-create-status`);
        const selectionAppId = $(`#dynamicRepair-selectionAppID`).val();
        const templateAppId = $(`#dynamicRepair-templateAppID`).val();
        $status.text(``);

        if (!checkGUIDs(selectionAppId, templateAppId)) {
            return $status.text(`Create Link Error: Invalid Selection App ID or Template App Id`);
        }

        $status.text(`Processing Create new link...`);
        createDynamicViewOdagLink(selectionAppId, templateAppId)
            .then(createdLink => {
                $status.text(`Link created, creating Selection App link usage`);
                dynamicRepairCache.link = createdLink.objectDef;
                return createSelAppLinkUsages(selectionAppId, createdLink.id);
            })
            .then(() => {
                $status.text(`Create Link Success. Link: ${dynamicRepairCache.link.name} (${dynamicRepairCache.link.id})`);
            })
            .catch(error => {
                $status.text(`Create Link Error: ${getHumanErrorMessage(error)}`);
                console.log(`Create Link Error:`, error);
            })
    });

    $(`#dynamicRepair-fetch-dynamicappviewID`).click(function () {
        const $status = $(`#dynamicRepair-fix-status`);
        const selectionAppId = $(`#dynamicRepair-selectionAppID`).val().trim();
        $status.text(``);

        if (!checkGUIDs(selectionAppId)) {
            return $status.text(`Fetch Error: Invalid Selection App ID`);
        }

        const $dynamicappviewID = $(`#dynamicRepair-dynamicappviewID`);
        $status.text(`Fetching...`);
        $dynamicappviewID.html(``);

        const fetchCache = {};
        return initDynamicRepairQsocks(selectionAppId)
            .then(() => {
                return dynamicRepairCache.qsocks.app.getObjects(`dynamicappview`);
            })
            .then(dynamicappviewList => {
                fetchCache.dynamicappviewList = dynamicappviewList;
                return ajaxCall({
                    method: `get`,
                    url: `${ODAGurl}/links`
                })
            })
            .then(links => {
                fetchCache.links = links;
            })
            .then(() => {
                fetchCache.dynamicappviewList.forEach((dynamicappview, index) => {
                    const id = dynamicappview.qInfo.qId;
                    const linkName = linkObj && linkObj.name;
                    $dynamicappviewID.append(`<option ${index === 0 ? "selected" : ""} value="${id}">${id} (${linkName || "Not Found"})</option>`);
                });
                $status.text(`Fetch Success. Found ${fetchCache.dynamicappviewList.length} dynamicappview's`);
            })
            .catch(error => {
                console.log(`Fetch Error:`, error);
                $status.text(`Fetch Error: ${getHumanErrorMessage(error)}`);
            });
    });

    $(`#dynamicRepair-fix`).click(function () {
        const $status = $(`#dynamicRepair-fix-status`);
        $status.text(``);

        if (!dynamicRepairCache.link) {
            return $status.text(`Apply Error: Create a link first`);
        }

        const selectionAppId = $(`#dynamicRepair-selectionAppID`).val();
        const templateAppId = $(`#dynamicRepair-templateAppID`).val();
        if (!checkGUIDs(selectionAppId, templateAppId)) {
            return $status.text(`Apply Error: Invalid selection App Id or template App Id`);
        }

        const dynamicappviewID = $(`#dynamicRepair-dynamicappviewID`).val();
        const containerID = $(`#dynamicRepair-containerID`).val();
        if (!checkIDs(dynamicappviewID, containerID)) {
            return $status.text(`Apply Error: Invalid dynamicappview ID or container ID`);
        }

        $status.text(`Applying...`);

        const fixCache = {};
        console.log(`Start repair dynamic view`);
        initDynamicRepairQsocks(selectionAppId)
            .then(() => {
                console.log(`Fetching dynamicappview: ${dynamicappviewID}`);
                $status.text(`Fetching dynamicappview: ${dynamicappviewID}`);
                return dynamicRepairCache.qsocks.app.getObject(dynamicappviewID);
            })
            .then(dynamicappviewHandle => {
                fixCache.dynamicappviewHandle = dynamicappviewHandle;
                return dynamicappviewHandle.getProperties();
            })
            .then(dynamicappviewProperties => {
                console.log(`dynamicappview:`, dynamicappviewProperties);
                $status.text(`Set new dynamicappview odagLinkRef...`);
                dynamicappviewProperties.qMetaDef.odagLinkRef = dynamicRepairCache.link.id;
                return fixCache.dynamicappviewHandle.setProperties(dynamicappviewProperties);
            })
            .then(() => {
                $status.text(`Fetching Container: ${containerID}`);
                console.log(`Fetching Container: ${containerID}`);
                return dynamicRepairCache.qsocks.app.getObject(containerID);
            })
            .then(containerHandle => {
                fixCache.containerHandle = containerHandle;
                return containerHandle.getProperties();
            })
            .then(containerProperties => {
                $status.text(`Set new Container external reference...`);
                console.log(`Container:`, containerProperties);
                if (containerProperties.children.length) {
                    let reference = containerProperties.children[0].externalReference;
                    reference.app = templateAppId;
                    reference.viewId = dynamicRepairCache.link.id;
                    return fixCache.containerHandle.setProperties(containerProperties);
                }
            })
            .then(() => {
                console.log(`Success:`);
                $status.text(`Apply Success...`);
            })
            .catch(error => {
                console.log(`Apply Error:`, error);
                $status.text(`Apply Error: ${getHumanErrorMessage(error)}`);
            })
    });

} );
