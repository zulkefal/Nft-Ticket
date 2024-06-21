import React, { useState } from "react";
import axios from "axios";
import "./CreateNFT.css";
import { CircularProgress } from "@mui/joy";
import { SnackbarProvider, useSnackbar } from "notistack";
import { ethers } from "ethers";
import NftAbi from "../SmartContract/ContractAbi"; // Adjust the path accordingly

const CreateNFT = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    ticketId: "",
    eventDate: "",
    eventLocation: "",
    eventName: "",
    participantName: "",
    issuerName: "",
    ticketType: "",
    seatNumber: "",
    image: "",
  });

  const [walletAddress, setWalletAddress] = useState("");
  const [file, setFile] = useState(null);
  const [imgHash, setImageHash] = useState("");
  const [jsonHash, setJsonHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingNFT, setLoadingNFT] = useState(false);
  const [defaultAccount, setDefaultAccount] = useState("");

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      setFormData((prevState) => ({ ...prevState, image: reader.result }));
    };

    if (file) {
      reader.readAsDataURL(file);

      setFile(file);
    } else {
      setFormData((prevState) => ({ ...prevState, image: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };
  const accountChangedHandler = (newAccount) => {
    let account = newAccount.toString();
    setDefaultAccount(account.slice(0, 42), "latest");
  };
  const chainChangedHandler = () => {
    window.location.reload();
  };
  const handleSubmit = async () => {
    setLoadingNFT(true);

    // console.log(walletAddress);
    const json = {

      image: "https://orange-solid-cattle-398.mypinata.cloud/ipfs/" + imgHash,
      attributes: [
        { trait_type: "Ticket ID", value: formData.ticketId },
        { trait_type: "Event Date", value: formData.eventDate },
        { trait_type: "Event Location", value: formData.eventLocation },
        { trait_type: "Event Name", value: formData.eventName },
        { trait_type: "Participant Name", value: formData.participantName },
        { trait_type: "Issuer Name", value: formData.issuerName },
        { trait_type: "Ticket Type", value: formData.ticketType },
        { trait_type: "Seat Number", value: formData.seatNumber },
      ],
    };

    console.log("JSON for NFT:", JSON.stringify(json, null, 2));
    const participantName = formData.participantName || "unknown";

    try {
      // Convert JSON object to Blob

      const jsonBlob = new Blob([JSON.stringify(json)], {
        type: "application/json",
      });

      // Create FormData and append JSON Blob
      const formData = new FormData();
      formData.append("file", jsonBlob, `${participantName}.json`);

      const responseJson = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
          pinata_secret_api_key: import.meta.env.VITE_PINATA_API_SECRET,
        },
      });

      console.log("IPFS hash for JSON:", responseJson.data.IpfsHash);
      setJsonHash(responseJson.data.IpfsHash);
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      if (responseJson.data.IpfsHash) {
        try {
          if (window.ethereum && window.ethereum.isMetaMask) {
            window.ethereum.on("accountsChanged", accountChangedHandler);
            window.ethereum.on("chainChanged", chainChangedHandler);
            let provider;
            provider = new ethers.BrowserProvider(window.ethereum);
            await window.ethereum.request({ method: "eth_requestAccounts" });
            const signer = await provider.getSigner();
            setWalletAddress(signer.address);
            console.log(signer.address);

            // Create contract instance
            const contract = new ethers.Contract(
              contractAddress,
              NftAbi,
              signer
            );
            // Example: Calling contract function (e.g., mint)
            console.log("I m jsonhash",responseJson.data.IpfsHash)
            const transaction = await contract.publicMint(responseJson.data.IpfsHash);

            //   // Wait for transaction confirmation
            const receipt = await transaction.wait();
            console.log("Transaction confirmed in block:", receipt);

            // Check transaction status
            if (receipt.status === 1) {
              console.log("Transaction successful!");
              enqueueSnackbar("Transaction successful!", {
                variant: "success",
              });
            } else {
              console.error("Transaction failed:", receipt);
              enqueueSnackbar("Transaction failed", { variant: "error" });
            }
          } else {
            console.error("MetaMask is not installed");
            enqueueSnackbar("MetaMask is not installed", { variant: "error" });
          }
        } catch (err) {
          console.error("Error interacting with MetaMask:", err);
          enqueueSnackbar("Error interacting with MetaMask", {
            variant: "error",
          });
        }
      }
    } catch (error) {
      if (error.response) {
        console.error(
          "Error uploading JSON to IPFS - Response:",
          error.response.data
        );
      } else if (error.request) {
        console.error("Error uploading JSON to IPFS - Request:", error.request);
      } else {
        console.error("Error uploading JSON to IPFS:", error.message);
      }
      alert("Unable to upload JSON to Pinata");
    } finally {
      setLoadingNFT(false);
    }
  };

  const uploadtoIPFS = async () => {
    setLoading(true);

    if (file) {
      try {
        const imgform = new FormData();
        imgform.append("file", file);

        const response = await axios({
          method: "post",
          url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
          data: imgform,
          headers: {
            "Content-Type": "multipart/form-data",
            pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
            pinata_secret_api_key: import.meta.env.VITE_PINATA_API_SECRET,
          },
        });

        console.log("IPFS hash:", response.data.IpfsHash);
        setImageHash(response.data.IpfsHash);
        enqueueSnackbar("Image Uploaded successfully !", {
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar("Image Not Uploaded successfully !", {
          variant: "error",
        });

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error(
            "Error uploading image to IPFS - Response:",
            error.response.data
          );
        } else if (error.request) {
          // The request was made but no response was received
          console.error(
            "Error uploading image to IPFS - Request:",
            error.request
          );
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("Error uploading image to IPFS:", error.message);
        }
        alert("Unable to upload image to Pinata");
      } finally {
        setLoading(false);
      }
    } else {
      alert("Please select an image file.");
      setLoading(false);
    }
  };

  return (
    <div className="mainNFT">
      <div className="add-img">
        <div className="img-set">
          {formData.image && <img src={formData.image} alt="Ticket" />}
        </div>
        <input
          type="file"
          id="img"
          name="img"
          accept="image/*"
          onChange={handleImageUpload}
          required
        />
        {formData.image && (
          <button className="Upload" onClick={uploadtoIPFS}>
            Upload it
          </button>
        )}

        {loading && <CircularProgress size="md" />}
      </div>
      <div className="details">
        <div className="main-nft2">
        <div className="inputField">
          <input
            type="text"
            name="ticketId"
            placeholder="Ticket ID"
            value={formData.ticketId}
            onChange={handleChange}
            required
          />
        </div>
        <div className="inputField">
          <input
            type="date"
            name="eventDate"
            placeholder="Event Date"
            value={formData.eventDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="inputField">
          <input
            type="text"
            name="eventLocation"
            placeholder="Event Location"
            value={formData.eventLocation}
            onChange={handleChange}
          />
         
        </div>
        <div className="inputField">
        <input
            type="text"
            name="eventName"
            placeholder="Event Name"
            value={formData.eventName}
            onChange={handleChange}
          />
        </div>
        <div className="inputField">
          <input
            type="text"
            name="participantName"
            placeholder="Participant Name"
            value={formData.participantName}
            onChange={handleChange}
          />
         
        </div>
        <div className="inputField">
        <input
            type="text"
            name="issuerName"
            placeholder="Issuer Name"
            value={formData.issuerName}
            onChange={handleChange}
          />
        </div>
        <div className="inputField">
          <input
            type="text"
            name="ticketType"
            placeholder="Ticket Type"
            value={formData.ticketType}
            onChange={handleChange}
          />
          
        </div>
        <div className="inputField">
        <input
            type="text"
            name="seatNumber"
            placeholder="Seat Number"
            value={formData.seatNumber}
            onChange={handleChange}
          />
        </div>
        {/* <div className="inputField address">
          <input
            type="text"
            name="address"
            placeholder="Recipient Address"
            onChange={(e) => setWalletAddress(e.target.value)}
          />
        </div> */}
        <br />
        
       
        </div>
        <div className="img-hash">
          {imgHash && (
            <label>
              Img Hash:{" "}
              <a
                href={
                  "https://orange-solid-cattle-398.mypinata.cloud/ipfs/" +
                  imgHash
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {"https://orange-solid-cattle-398.mypinata.cloud/ipfs/" +
                  imgHash}
              </a>
            </label>
          )}
          <br />
          <br />
          {jsonHash && (
            <label>
              Json Hash:{" "}
              <a
                href={
                  "https://orange-solid-cattle-398.mypinata.cloud/ipfs/" +
                  jsonHash
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {"https://orange-solid-cattle-398.mypinata.cloud/ipfs/" +
                  jsonHash}
              </a>
            </label>
          )}
        </div>
        <button className="nft-button" onClick={handleSubmit}>
          Create NFT
        </button>
        {loadingNFT && <CircularProgress size="md" />}
      </div>
    </div>
  );
};

export default CreateNFT;
