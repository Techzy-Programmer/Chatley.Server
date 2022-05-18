'use strict';
let events = [], ttls = 0,
msgs = { }, allClients = [];
const WSock = require('ws'),
cryptHsh = require('crypto'),
expApp = require('express')(),
strFY = (JObj) => JSON.stringify(JObj),
wsServer = new WSock.Server({ port: process.env.PORT || 80 }),

rndNum = (min, max) => {
	min = Math.ceil(min); max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
},

rndColor = () =>  {
	let factor = [], cngF = [];
	for (let i = 0; i < 3; i++) { factor.push(rndNum(155, 215)); cngF.push(rndNum(5, 40)); }
	return `rgb(${(factor[0] + cngF[0])}, ${(factor[1] + cngF[1])}, ${(factor[2] + cngF[2])})`;
};

function log(p1, p2 = null)
{
	const mode = 'prod';
	if (mode != 'dbg') return;
	console.log(p1, p2, "[(Logs)]");
}

function broadcast(data, exclude = [])
{
	log(`~ Broadcasting ${data.Type}`);
	allClients.forEach((wsE) => (exclude.indexOf(wsE) < 0) && wsE.send(JSON.stringify(data)));
}

function setKiller(wsOp)
{
	if (wsOp.kill) clearTimeout(wsOp.kill);
	wsOp.kill = setTimeout(() => killUser(wsOp), 20 * 1000);
}

function killUser(wsUsr, killType = 'Timeout')
{
	let kI;
	wsUsr.dead = true;
	clearInterval(wsUsr.alive);
	clearInterval(wsUsr.lim.killer);

	if (!wsServer.clients.size)
	{
		allClients = [];
		ttls = 0;
		return;
	}
	
	if ((kI = allClients.indexOf(wsUsr)) > -1)
	{
		allClients.splice(kI, 1);
		setTimeout(() => wsUsr.terminate(), 200); // Terminate
		if (wsUsr.name) broadcast({ Type: 'Left', Who: wsUsr.uId });
		events.push({ Type: 'Left', At: Date.now(), User: wsUsr.uId });
		wsUsr.send(strFY({ Type: "Error", Detail: "No reply in last 12s" }));
		log(`~ Killing > [${wsUsr.name}] At > [${kI}] Left > [${allClients.length}] Type > [${killType}]`);
	}
}

let hashify = (raw) => cryptHsh
.createHash('md5').update(raw).digest('hex');

function passAbuseFilter(chatMsg)
{
	const abuseWordsFilter = 	['3c3662bcb661d6de679c636744c66b62', '3f23b9476dd8408efa16813bb2551bdf', '99754106633f94d350db34d548d6091a', 'b52b073595ccb35eaebb87178227b779', '25d7ffd1557b565b27450d9c5b78735b', 'a6ab927538c392303c3d88287ac0d099', '3cdba90342776be5ea5d24a990d663f7', 'c7cbbf3de4782a8e8fb3db96993f3c3a', '7229e6bf22ad4538741f5d2442e7be70', 'd404045ac96a5ca5a22dfc1f945e143b', '1961ae749d853643ffb1093ae0130438', 'd24a98fdc3760325314cc68823406dfd', '1be81c3d17831f66762187b4d3cd08d0', 'bc139dad1583ec7662b8c4f7221b6826', '824480c057c79ea13fea80f0f1ca7037', '5187942d399d4ed244068db70a11319e', 'dc6712194e5c7471875ccc570b45faf9', '14b092c133fb19b07651a005ed83860b', 'ec1a08ca25857e260784856b3556804d', 'b0d7afc8ffd4ec4150ce9bba29f20969', "3796fbfbf604f9b9b6b44894a577d9d6", "8561b0da13f41d736812e2f12b078a40", "7828e97cf512564affbe2d16d1a5bdd8", "964d72e72d053d501f2949969849b96c", "0b9a54438fba2dc0d39be8f7c6c71a58", "1223b8c30a347321299611f873b449ad", "9268d0b2d17670598c70045b0c7abf38", "3e12ec4d994fefe424c88687d738a874", "a3911fb0c6cb6cc857e2aed25f17e168", "d2aefeac9dc661bc98eebd6cc12f0b82", "aac0a9daa4185875786c9ed154f0dece", "c07e856399e56cbd8ddf9572812921af", "0ae36736c705c11332433d5e68307607", "2da1ab427df46b3cf8c7b28536c41fa5", "bca592ad6fb48ae994c0a2d9382061a8", "8d70e0d1acb06b4648c7aa8927509660", "24e218d3c2a7da0eda40ae15c78f6778", "e78c757d0b785c7f896d929c9a5277ac", "020850d48c4aa70fc2bb520c5b8f5310", "b4a6e7e89dee6fa8781d690540a3782f", "c29b0f2822df70edc474f6f47d3c0dc3"],
	sspWords = chatMsg.split(' ');

	for (let echWord of sspWords)
	{
		echWord = echWord.toLowerCase();
		let susptWords = [echWord], sntWord = echWord.replaceAll('@', 'a')
		.replaceAll('$', 's').replaceAll('*', 'u');	if (sntWord !== echWord) susptWords.push(sntWord);
		for (const susptWrd of susptWords) if (abuseWordsFilter.includes(hashify(susptWrd))) return false;
	}

	return true;
}

wsServer.on('connection', (wsC) =>
{
	if (allClients.length >= 64)
	{
		log('~ Server Is Now Full');
		setTimeout(() => wsC.terminate(), 200);
		wsC.send(strFY({ Type: 'Error', Detail:
		'Max User Joined' }));
		return;
	}

	wsC.on('message', (uMsg) =>
	{
		try
		{
			if (wsC.dead) return;
			const uData = JSON.parse(uMsg);

			if (!wsC.name)
			{
				if (uData.Type == "Metadata" && uData.Name?.length >= 2 && uData.Name?.length <= 20)
				{
					setKiller(wsC);
					let youId = ++ttls;
					allClients.push(wsC);
					wsC.name = uData.Name;
					wsC.chatClr = rndColor();
					log(`~ User -> ${wsC.name} Joined!`);
					wsC.uId = `u${youId}`; msgs[wsC.uId] = { };
					wsC.send(strFY({ Type: 'YourID', Id: wsC.uId }));
					wsC.lim = { sent: 0, limited: false, killer: null };
					events.push({ Type: 'Join', At: Date.now(), User: wsC.uId });
					wsC.lim.killer = setInterval(() => wsC.lim.sent = 0, 20 * 1000);
					wsC.alive = setInterval(() => wsC.send(strFY({ Type: "Ping" })), 12 * 1000);
					broadcast({ Type: 'Joined', Who: { I: wsC.uId, N: wsC.name, C: wsC.chatClr } }, [wsC]);

					if (allClients.length > 1)
					{
						let TmpUNames = allClients
							.filter((wsO) => wsO != wsC)
							.map((wsVal) => { return { I: wsVal.uId,
								N: wsVal.name, C: wsVal.chatClr } });
						wsC.send(strFY({ Type: 'Users', Users: TmpUNames }));
					}
				}
			}
			else if (uData.Type)
			{
				setKiller(wsC);

				switch (uData.Type)
				{
					case "Msg":
						if (uData.Chat?.length && uData.Chat?.length <= 2048)
						{
							if (!passAbuseFilter(uData.Chat))
							{
								wsC.send(strFY({ Type: 'Warn', Id: uData.Id, Ban: 0,
									Detail: "Abusing Isn't Allowed!" }));
								return;
							}

							if (wsC.lim.sent >= 10)
							{
								wsC.send(strFY({ Type: 'Warn', Id: uData.Id, Ban: 1,
									Detail: 'Limit Crossed, Wait...' }));
								return;
							}

							wsC.lim.sent++;
							let Reply = null;
							msgs[wsC.uId][uData.Id] = true;

							if (Array.isArray(uData.Reply) && uData.Reply?.length == 2 &&
							msgs[uData.Reply[0]][uData.Reply[1]]) Reply = { Who: uData.Reply[0], MsgId: uData.Reply[1] };

							broadcast({ Type: 'Chat', From: wsC.uId,
								Msg: uData.Chat, Id: uData.Id, Reply }, [wsC]);
							events.push({ Type: 'Message', At: Date.now(), User:
								wsC.uId, Msg: uData.Chat, Id: uData.Id });
						}
						else wsC.send(strFY({ Type: 'Error', Detail: 'Invalid Message Sent!' }));
						break;
					
					case "Typing":
						if (wsC.typing == -1) broadcast({ Type: 'Typing',
							Who: wsC.uId }, [wsC]); clearTimeout(wsC.typing);
						
						wsC.typing = setTimeout(() =>
						{
							wsC.typing = -1;
							broadcast({ Type: 'Typing-End',
								Who: wsC.uId }, [wsC]);
						}, 2000);
						break;
						
					case 'Pong': break;

					default:
						log(`~ Invalid Command Received -> ${uData.Type}`);
						wsC.send(strFY({ Type: 'Error', Detail: 'Invalid request made' }));
						break;
				}
			}
		}
		catch(eP)
		{
			log(`~ Exception > Type:[${eP.name}] & Message:[${eP.message}]`)
			wsC.send(strFY({ Type: 'Error', Detail: 'Invalid data sent' }));
		}
	});

	wsC.kill = 0;
	wsC.typing = -1;
	wsC.dead = false;
	wsC.send('{"Type": "Acknowledge"}');
	wsC.on('close', () => killUser(wsC, 'Event'));
});

log('~ Server Has Been Started!');
expApp.get('*', (_req, res) => { res.send('Upgrade-Required'); });
