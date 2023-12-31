export function launch(ctx) {
    ctx.create_scene('gameRoom', function () {
        let waitingForSync = true;
        let turn_tracker;
        var show_inventory = false;
        var current_player;
        var selectedItem;
        this.init = function () {
            var objects_on_field = [];
            var players_on_field = [];
            var monsters_on_field = [];
            selectedItem = 0;
            let createLogger = (text) => {
                let state = true;
                let alpha = 0.3;
                let hue = randomRangeInt(0, 360);
                let posY = ctx.view.position.y + randomRange(100, 220);
                ctx.create_object(this, {
                    text: text,
                    size: 30,
                    position: ctx.vector2(ctx.view.position.x + randomRange(900, 1000), ctx.view.position.y + ctx.size / 5),
                    layer: "text",
                    alignment: 'right',
                    color: "black",
                }, (p) => {
                    p.color = `hsl(${hue}, 100%, 50%, ${alpha})`;
                    hue++;
                    posY -= 0.1;
                    p.position.y = posY;
                    if (state) {
                        alpha += 0.03;
                        if (alpha >= 1) {
                            state = false;
                        }
                    } else {
                        alpha -= 0.01;
                        if (alpha <= 0.1) {
                            p.destroy();
                        }
                    }
                })
            };
            gameInitialize((playerIndex, pack) => {
                switch (pack.cmdID) {
                    case commands.Internal:
                        createLogger(pack.text);
                        break;
                    case commands.Disconnected:
                        ctx.set_scene('lobbySelectRoom');
                        break;
                    case commands.Item:
                        switch (pack.itemID) {
                            case 4:
                                ctx.create_object(this, {
                                        position: ctx.vector2(players[playerIndex].fieldCoordinates.x, players[playerIndex].fieldCoordinates.y),
                                        layer: "main",
                                        size: ctx.vector2(16 * MapScale, 16 * MapScale),
                                        sprite: "assets/sprites/magic_fireball.png",
                                        death_speed: 0.03,
                                    },
                                    (p) => {
                                        if (!p.isDying && p.IsInView()) {
                                            switch (pack.direction) {
                                                case 0:
                                                    p.move(ctx.vector2(0, -10));
                                                    break
                                                case 1:
                                                    p.move(ctx.vector2(10, 0));
                                                    break
                                                case 2:
                                                    p.move(ctx.vector2(0, 10));
                                                    break
                                                case 3:
                                                    p.move(ctx.vector2(-10, 0));
                                                    break
                                            }
                                            for (let i = 0; i < players_on_field.length; i++) {
                                                if (players_on_field[i].isCollision(p) && pack.player !== players[i]) {
                                                    players[i].getDamage(pack.player.power);
                                                    p.destroy();
                                                }
                                            }
                                            for (let i = 0; i < mapWidth - 1; i++) {
                                                for (let j = 0; j < mapHeight - 1; j++) {
                                                    if (gameMap[i][j].monsterID !== undefined)
                                                        if (monsters_on_field[i.toString() + j].isCollision(p)) {
                                                            gameMap[i][j].monster.getDamage(pack.player.power, pack.player, true);
                                                            p.destroy();
                                                        }
                                                }
                                            }
                                        }
                                    }
                                )
                        }
                }

            });
            current_player = getCurrentPlayerIndex();
            var game_map = getGameMap();
            for (let i = 0; i < mapWidth; i++)
                for (let j = 0; j < mapHeight; j++) {
                    if (getCellType(gameMap[i][j].cellTypeID) === undefined)
                        console.log(gameMap[i][j].cellTypeID)
                    ctx.create_object(this, {
                        position: ctx.vector2(game_map[i][j].x * 32 * MapScale, game_map[i][j].y * 32 * MapScale),
                        size: ctx.vector2(32 * MapScale, 32 * MapScale),
                        sprite: getCellType(gameMap[i][j].cellTypeID).sprite,
                        layer: "cells",
                        color: "black"
                    });
                    if (gameMap[i][j].decorID !== undefined)
                        ctx.create_object(this, {
                            position: ctx.vector2(game_map[i][j].x * 32 * MapScale, game_map[i][j].y * 32 * MapScale),
                            size: ctx.vector2(32 * MapScale, 32 * MapScale),
                            sprite: getDecoration(gameMap[i][j].decorID).sprite,
                            layer: "decorations",
                        });
                    if (gameMap[i][j].itemID !== undefined)
                        objects_on_field[i.toString() + j] = ctx.create_object(this, {
                            position: ctx.vector2(game_map[i][j].x * 32 * MapScale, game_map[i][j].y * 32 * MapScale),
                            size: ctx.vector2(32 * MapScale, 32 * MapScale),
                            sprite: getItem(gameMap[i][j].itemID).sprite,
                            layer: "decorations",
                        });
                    if (gameMap[i][j].monsterID !== undefined)
                        monsters_on_field[i.toString() + j] = ctx.create_object(this, {
                                position: ctx.vector2(game_map[i][j].x * 32 * MapScale, game_map[i][j].y * 32 * MapScale),
                                size: ctx.vector2(24 * MapScale, 24 * MapScale),
                                sprite: getMonster(gameMap[i][j].monsterID).sprite,
                                layer: "decorations",
                            },
                            (p) => {
                                ctx.get_layer('text').draw_object({
                                    x: p.position.x,
                                    y: p.position.y - 5 * MapScale,
                                    height: 5,
                                    width: gameMap[i][j].monster.health / 10,
                                    color: "red",
                                    anchor: true
                                })
                                if (gameMap[i][j].monster.health <= 0)
                                    p.destroy();
                            }
                        );
                }
            for (let i = 0; i < players.length; i++)
                players_on_field[i] = ctx.create_object(this, {
                        position: players[i].fieldCoordinates,
                        size: ctx.vector2(32 * MapScale, 32 * MapScale),
                        sprite: "assets/sprites/player.png",
                        death_speed: 0.003,
                        layer: "main",

                    },
                    (p) => {
                        if (!p.isDying) {
                            ctx.get_layer('text').draw_text({
                                text: players[i].name,
                                x: p.position.x + (32 / 2) * MapScale,
                                y: p.position.y - 6 * MapScale,
                                size: 15,
                                color: "black",
                                alignment: 'center'
                            })
                            ctx.get_layer('text').draw_object({
                                x: p.position.x,
                                y: p.position.y + 5 * MapScale,
                                height: 5,
                                width: (players[i].health) / 4,
                                color: "red"
                            })
                            ctx.get_layer('text').draw_object({
                                x: p.position.x,
                                y: p.position.y + 10 * MapScale,
                                height: 5,
                                width: (players[i].mana) / 4,
                                color: "blue"
                            })
                            if (players[i].cell.itemID !== undefined) {

                                players[i].cell.itemID = undefined;
                                objects_on_field[players[i].cell.x.toString() + players[i].cell.y].destroy();
                            }
                            if (players[i].health <= 0) {
                                players[i].isdead = true
                                p.destroy();
                                turn_tracker.finishTurn();
                            }
                        }
                    }
                );
            turn_tracker = new TurnTracker((turn) => {
                if (players[turn].isdead) return;
                if (players[turn].isAI === true) {
                    doAITurn(players[turn], turn_tracker);
                }
            }, (turn) => {
                if (!isAiGame) {
                    if (turn_tracker.turnCnt + 1 % players.length === current_player) {
                        cleanCachedEvents(playerID);
                    }
                    waitingForSync = true;
                    sync();
                } else {
                    turn_tracker.start();
                }
            });
            ctx.create_object(this, {
                    text: '',
                    size: 50,
                    position: ctx.vector2(ctx.view.position.x + 500, ctx.view.position.y + 500),
                    layer: "text",
                    color: "black",
                    death_speed: -0.03,
                    opacity: 0.95,
                },
                (p) => {
                    p.text = waitingForSync ? 'Игроков готово: ' + syncCounter % players.length : turn_tracker.timeLeft;
                    p.opacity += p.death_speed;
                    if ((p.opacity < 0.1) || (p.opacity > 0.96)) p.death_speed *= (-1);
                    p.position = ctx.vector2(ctx.view.position.x + ctx.size.x / 2, ctx.view.position.y + ctx.size.y / 20);
                }
            )
            ctx.create_object(this, {
                    text: '',
                    size: 30,
                    position: ctx.vector2(ctx.view.position.x + 500, ctx.view.position.y + 500),
                    layer: "text",
                    color: "black",
                    death_speed: -0.03,
                    alignment: 'center',
                    opacity: 0.95,
                },
                (p) => {
                    p.text = waitingForSync || turn_tracker.currentPlayerIndex === -1 ? 'Ожидание игроков... ' : (current_player === turn_tracker.currentPlayerIndex ? 'Сейчас ВАШ ход!' : 'Сейчас ход ' + players[turn_tracker.currentPlayerIndex].name);
                    p.opacity += p.death_speed;
                    if ((p.opacity < 0.1) || (p.opacity > 0.96)) p.death_speed *= (-1);
                    p.position = ctx.vector2(ctx.view.position.x + ctx.size.x / 2, ctx.view.position.y + ctx.size.y / 10);
                }
            )
            let fireballFunc = (direction) => {
                let params = {current_player, direction: direction};
                getItem('4').useItem(players[current_player], params);
                makeEvent({cmdID: commands.Item, itemID: '4', p: JSON.stringify(params)})
            };
            ctx.view.move(players[current_player].fieldCoordinates, true);
            window.addEventListener('keyup', function (e) {
                    if (current_player === turn_tracker.currentPlayerIndex) {
                        let x = players[current_player].cell.x;
                        let y = players[current_player].cell.y;
                        switch (e.code) {
                            case 'KeyW':
                                if (y > 0)
                                    players[current_player].move(game_map[x][y - 1]);
                                break;
                            case 'KeyS':
                                if (y < mapHeight - 1)
                                    players[current_player].move(game_map[x][y + 1]);
                                break;
                            case 'KeyD':
                                if (x < mapWidth - 1)
                                    players[current_player].move(game_map[x + 1][y]);
                                break;
                            case 'KeyA':
                                if (x > 0)
                                    players[current_player].move(game_map[x - 1][y]);
                                break;
                            case 'ArrowUp':
                                if (direction[0]) {
                                    fireballFunc(0);
                                    direction[0] = false;
                                } else {
                                    if (selectedItem !== 0)
                                        selectedItem--;
                                }
                                break;
                            case 'ArrowRight':
                                if (direction[0]) {
                                    fireballFunc(1);
                                    direction[0] = false;
                                }
                                break;
                            case 'ArrowDown':
                                if (direction[0]) {
                                    fireballFunc(2);
                                    direction[0] = false;
                                } else {
                                    if (selectedItem < players[current_player].items.size - 1)
                                        selectedItem++;
                                }
                                break;
                            case 'ArrowLeft':
                                if (direction[0]) {
                                    fireballFunc(3);
                                    direction[0] = false;
                                }
                                break;
                            case 'KeyE':
                                if (show_inventory) {
                                    if (players[current_player].isdead === true) break;
                                    let itemId = players[current_player].items.keys();
                                    for (let j = 0; j < selectedItem; j++) itemId.next();
                                    let item = getItem(itemId.next().value)
                                    if (!((item.type === 'Magic') && (item.name === "Файрбол"))) {
                                        item.useItem(players[current_player], {current_player})
                                        selectedItem = 0;
                                        makeEvent({
                                            cmdID: commands.Item,
                                            itemID: item.ID,
                                            p: JSON.stringify({current_player})
                                        });
                                    } else direction[0] = true;
                                }
                                break;
                        }
                        if (players[current_player].cell.x !== x || players[current_player].cell.y !== y) {
                            makeEvent({
                                cmdID: commands.Movement,
                                x: players[current_player].cell.x,
                                y: players[current_player].cell.y
                            });
                        }
                        ctx.view.move(players[current_player].fieldCoordinates);
                    }
                    if (e.code === 'KeyI') {
                        show_inventory = !show_inventory;
                    }
                }
            );
            var direction = [false, -1];

            if (!isAiGame) sync();
        };
        this.update = function () {
            if (waitingForSync) {
                if (syncCounter / players.length === turn_tracker.turnCnt + 2 || isAiGame) {
                    waitingForSync = false;
                    turn_tracker.start();
                }
            }
        };
        this.draw = function () {
            if (show_inventory) {
                ctx.get_layer('window').draw_object({
                    x: ctx.view.position.x,
                    y: ctx.view.position.y,
                    width: 200,
                    height: 300,
                    file: "assets/sprites/background_inventory.png"
                })
                let items = players[current_player].items.entries();
                let yOff = ctx.view.position.y + 50;
                let y = 0
                for (let i of items) {
                    let item_name = itemTypeList[i[0]].name
                    ctx.get_layer('window_text').draw_text({
                        x: ctx.view.position.x + 10 + 5,
                        y: yOff,
                        size: 15,
                        color: y === selectedItem ? 'red' : 'white',
                        text: item_name + " x" + i[1],
                    });
                    yOff += 30
                    y++;
                }

            }
        }
        this.exit = function () {
        };

    })
    ;
}