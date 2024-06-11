import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createGenericFile, createSignerFromKeypair, generateSigner, keypairIdentity, percentAmount, sol } from '@metaplex-foundation/umi';
import { mockStorage } from '@metaplex-foundation/umi-storage-mock';
import * as fs from 'fs';
import secret from './wallet.json';
import { QUICKNODE_RPC } from "./url"
 
const umi = createUmi(QUICKNODE_RPC); 

const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const creator = createSignerFromKeypair(umi, creatorWallet);
umi.use(keypairIdentity(creator));
umi.use(mplTokenMetadata());
umi.use(mockStorage());

const nftDetail = {
    name: "samurai_samurai",
    symbol: "<>",
    uri: "IPFS_URL_OF_METADATA",
    royalties: 5.5,
    description: 'strong, brave, quick',
    imgType: 'image/png',
    attributes: [
        { trait_type: 'Speed', value: 'Quick' },
    ]
};

async function uploadImage(): Promise<string> {
    try {
        const imgDirectory = '../uploads';
        const imgName = 'image.png'
        const filePath = `${imgDirectory}/${imgName}`;
        const fileBuffer = fs.readFileSync(filePath);
        const image = createGenericFile(
            fileBuffer,
            imgName,
            {
                uniqueName: nftDetail.name,
                contentType: nftDetail.imgType
            }
        );
        const [imgUri] = await umi.uploader.upload([image]);
        console.log('Uploaded image:', imgUri);
        return imgUri;
    } catch (e) {
        throw e;
    }
}

async function uploadMetadata(imageUri: string): Promise<string> {
    try {
        const metadata = {
            name: nftDetail.name,
            description: nftDetail.description,
            image: imageUri,
            attributes: nftDetail.attributes,
            properties: {
                files: [
                    {
                        type: nftDetail.imgType,
                        uri: imageUri,
                    },
                ]
            }
        };
        const metadataUri = await umi.uploader.uploadJson(metadata);
        console.log('Uploaded metadata:', metadataUri);
        return metadataUri;
    } catch (e) {
        throw e;
    }
}

async function mintNft(metadataUri: string) {
    try {
        const mint = generateSigner(umi);
        await createNft(umi, {
            mint,
            name: nftDetail.name,
            symbol: nftDetail.symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: percentAmount(nftDetail.royalties),
            creators: [{ address: creator.publicKey, verified: true, share: 100 }],
        }).sendAndConfirm(umi)
        console.log(`Created NFT: ${mint.publicKey.toString()}`)
    } catch (e) {
        throw e;
    }
}

async function main() {
    const imageUri = await uploadImage();
    const metadataUri = await uploadMetadata(imageUri);
    await mintNft(metadataUri);
}

main();