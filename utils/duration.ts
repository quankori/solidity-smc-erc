// @ts-ignore
import { ethers } from "hardhat";
const duration = {
  seconds: function (val) {
    return val;
  },
  minutes: function (val) {
    return val * this.seconds(60);
  },
  hours: function (val) {
    return val * this.minutes(60);
  },
  days: function (val) {
    return val * this.hours(24);
  },
  months: function (val) {
    return val * this.days(31);
  },
  nextBlockTime: async function (day) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      Math.floor(Date.now() / 1000) + day * 24 * 60 * 60,
    ]);
  },
  setBlockTime: async function (timestamp) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  },
  resetBlockTime: async function () {
    const blockNumber = ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    const secondsDiff = currentTimestamp - block.timestamp;
    await ethers.provider.send("evm_increaseTime", [secondsDiff]);
    await ethers.provider.send("evm_mine", []);
  },
};
export default duration;
