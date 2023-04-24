const { network, ethers } = require("hardhat")
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config.js")
const { verify } = require("../utils/verify.js")
const {
  storeImages,
  storeTokenUriMetadata,
} = require("../utils/uploadToPinata.js")

const imagesLocation = "./images/randomNft"

const metadataTemplate = {
  name: "",
  description: "",
  image: "",
}

// IPFS
let tokenUris = [
  "ipfs://QmaWzpJrSnCRTkpxWHRhaihZcgt2KUk3u9fhgCDgBVXQum",
  "ipfs://QmS8NXJui2SEbTAYLGcE3M1TmuaDh6dGRuj3xWmmjQqCZ6",
  "ipfs://QmY3tp8FqaqJzaWHWAcqzdyK4XcaFgMbbcWcs2jjHfK54v",
]

const FUND_AMOUNT = ethers.utils.parseEther("0.1")

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId

  if (process.env.UPLOAD_TO_PINATA === "true") {
    tokenUris = await handleTokenUris()
  }

  let vrfCoordinatorV2Address, subscriptionId

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    )
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
    const tx = await vrfCoordinatorV2Mock.createSubscription()
    const txReceipt = await tx.wait(1)
    subscriptionId = txReceipt.events[0].args.subId
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
    subscriptionId = networkConfig[chainId].subscriptionId
  }

  console.log("<--->")

  //
  // await storeImages(imagesLocation)

  /*
    address vrfCoordinatorV2,
    uint64 subscriptionId,
    bytes32 gasLane,
    uint32 callbackGasLimit,
    string[3] memory dogTokenUris,
    uint256 mintFee
  */

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId].gasLane,
    networkConfig[chainId].callbackGasLimit,
    tokenUris,
    networkConfig[chainId].mintFee,
  ]

  const randomIpfsNft = await deploy("RandomIpfsNft", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  log("<--->")

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying on Etherscan. This will take a while...")
    await verify(randomIpfsNft.address, args)
  }
}

async function handleTokenUris() {
  tokenUris = []
  // store the image
  // store the metadata

  const { responses: imageUploadResponses, files } = await storeImages(
    imagesLocation
  )
  for (imageUploadResponseIndex in imageUploadResponses) {
    let tokenUriMetadata = { ...metadataTemplate }
    tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
    tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
    tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`

    console.log(`Uploading: ${tokenUriMetadata.name}...`)
    // Json
    const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
    tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
  }

  console.log("Token URIs: ", tokenUris)
  return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
