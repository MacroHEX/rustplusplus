const Items = require('../util/items.js');
const MapCalc = require('../util/mapCalculations.js');
const RustPlusTypes = require('../util/rustplusTypes.js');

module.exports = {
    checkEvent: function (rustplus, client, info, mapMarkers, teamInfo, time) {
        /* Check if new Vending Machine is detected */
        module.exports.checkNewVendingMachineDetected(rustplus, info, mapMarkers);

        /* Go through sellOrders to see if it includes items that we are looking for */
        module.exports.checkItemsFromSellOrders(rustplus, info, mapMarkers);
    },

    checkNewVendingMachineDetected: function (rustplus, info, mapMarkers) {
        for (let marker of mapMarkers.response.mapMarkers.markers) {
            if (marker.type === RustPlusTypes.MarkerType.VendingMachine) {
                let mapSize = info.response.info.mapSize;
                let outsidePos = MapCalc.getCoordinatesOrientation(marker.x, marker.y, mapSize);
                let gridPos = MapCalc.getGridPos(marker.x, marker.y, mapSize);
                let pos = (gridPos === null) ? outsidePos : gridPos;

                if (!rustplus.activeVendingMachines.some(e => e.x === marker.x && e.y === marker.y)) {
                    rustplus.activeVendingMachines.push({ x: marker.x, y: marker.y });

                    let str = `New Vending Machine located at ${pos}.`;
                    let setting = rustplus.notificationSettings.vendingMachineDetected;
                    if (!rustplus.firstPoll && setting.discord) {
                        rustplus.sendEvent(str, setting.image);
                    }
                    if (!rustplus.firstPoll && setting.inGame) {
                        rustplus.sendTeamMessage(`Event: ${str}`);
                    }
                    rustplus.log(str);
                }
            }
        }
    },

    checkItemsFromSellOrders: function (rustplus, info, mapMarkers) {
        for (let marker of mapMarkers.response.mapMarkers.markers) {
            if (marker.type === RustPlusTypes.MarkerType.VendingMachine) {
                for (let order of marker.sellOrders) {
                    /* if itemId or currencyId is in itemsToLookForId */
                    if (rustplus.itemsToLookForId.includes(order.itemId) ||
                        rustplus.itemsToLookForId.includes(order.currencyId)) {
                        if (!module.exports.isAlreadyInFoundItems(rustplus, marker.x, marker.y, order)) {
                            if (order.amountInStock >= 1) {
                                /* Add to the array of found items */
                                module.exports.addToFoundItems(rustplus, marker.x, marker.y, order);

                                let item = '';
                                if (rustplus.itemsToLookForId.includes(order.itemId) &&
                                    rustplus.itemsToLookForId.includes(order.currencyId)) {
                                    item = Items.getName(order.itemId) + ' and ';
                                    item += Items.getName(order.currencyId);
                                }
                                else if (rustplus.itemsToLookForId.includes(order.itemId)) {
                                    item = Items.getName(order.itemId);
                                }
                                else if (rustplus.itemsToLookForId.includes(order.currencyId)) {
                                    item = Items.getName(order.currencyId);
                                }

                                let gridLocation = MapCalc.getGridPos(marker.x, marker.y, info.response.info.mapSize);

                                let str = `${item} was found in a Vending Machine at ${gridLocation}.`;
                                let setting = rustplus.notificationSettings.vendingMachineDetected;
                                rustplus.sendEvent(str, setting.image);
                                rustplus.log(str);
                            }
                        }
                    }
                }
            }
        }
    },

    isAlreadyInFoundItems: function (rustplus, x, y, order) {
        return rustplus.foundItems.some(e => e.x === x && e.y === y &&
            e.itemId === order.itemId && e.quantity === order.quantity &&
            e.currencyId === order.currencyId && e.costPerItem === order.costPerItem)
    },

    addToFoundItems: function (rustplus, x, y, order) {
        rustplus.foundItems.push({
            x: x, y: y, itemId: order.itemId, quantity: order.quantity,
            currencyId: order.currencyId, costPerItem: order.costPerItem
        });
    },
}