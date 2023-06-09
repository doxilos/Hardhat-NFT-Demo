const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts }) {
  const { deployer } = await getNamedAccounts()

  // Mint basic NFT
  const basicNft = await ethers.getContract("BasicNFT", deployer)
  const basicMintTx = await basicNft.mintNft()
  await basicMintTx.wait(1)
  console.log(
    `Basic NFT at index 0 has tokenURI: ${await basicNft.tokenURI(0)}`
  )

  // Mint random IPFS NFT
  const randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
  const mintFee = await randomIpfsNft.getMintFee()
  const randomIpfsNftMintTx = await randomIpfsNft.requestNft({
    value: mintFee.toString(),
  })
  const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1)

  await new Promise(async (resolve, reject) => {
    setTimeout(resolve, 3000)
    randomIpfsNft.once("NftMinted", async function () {
      resolve()
    })
    if (developmentChains.includes(network.name)) {
      const requestId =
        randomIpfsMintTxReceipt.events[1].args.requestId.toString()
      const VRFCoordinatorV2Mock = await ethers.getContract(
        "VRFCoordinatorV2Mock",
        deployer
      )
      await VRFCoordinatorV2Mock.fulfillRandomWords(
        requestId,
        randomIpfsNft.address
      )
    }
  })
  console.log(
    `Random IPFS NFT at index 0 has tokenURI: ${await randomIpfsNft.tokenURI(
      0
    )}`
  )

  // Dynamic SVG NFT
  const highValue = ethers.utils.parseEther("4000")
  const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer)
  const dynamicSvgNftMintTx = await dynamicSvgNft.mintNft(highValue)
  await dynamicSvgNftMintTx.wait(1)
  console.log(
    `Dynmaic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`
  )
}

module.exports.tags = ["all", "mint"]
