// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

// ============================================================
//  ViveroNFT.sol — Certificados NFT de Conservación del Páramo
//  Estándar: ERC-721 (OpenZeppelin v5)
//
//  ¿Qué hace este contrato?
//  ─────────────────────────────────────────────────────────
//  Cada vez que se traslada una planta al páramo en el contrato
//  Vivero.sol, este contrato acuña automáticamente un NFT
//  único que certifica la conservación.
//
//  La imagen del NFT es la FOTO REAL tomada con la cámara
//  del móvil/desktop en el PlantTransferModal, subida a IPFS.
//
//  Despliegue recomendado:
//  - Ganache: para pruebas sin IPFS real
//  - Sepolia: para ver los NFTs en OpenSea testnet
//
//  CORRECCIÓN OZ v5:
//  ✅ Eliminado Counters.sol (removido en OpenZeppelin v5)
//  ✅ Reemplazado por contador manual uint256 _tokenIdActual
//  ✅ Ownable(msg.sender) — sintaxis requerida en OZ v5

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ✅ ELIMINADO: import "@openzeppelin/contracts/utils/Counters.sol"
//    Counters fue removido en OpenZeppelin v5. Se usa contador manual.

contract ViveroNFT is ERC721URIStorage, Ownable {
    // ✅ CORREGIDO: contador manual en lugar de Counters.Counter
    // Antes: Counters.Counter private _tokenIds;
    // Ahora:
    uint256 private _tokenIdActual = 0;

    // ─── Dirección del contrato Vivero (único autorizado
    //     para acuñar NFTs automáticamente al registrar traslado)
    address public viveroContrato;

    // ─── Metadata de cada NFT ────────────────────────────────
    struct MetadataNFT {
        uint256 tokenId;
        uint256 idPlanta;
        uint256 idSemilla;
        string especie;
        string responsable;
        int256 latitud;
        int256 longitud;
        int256 temperatura;
        uint256 humedad;
        uint256 altitud;
        uint256 fechaMinteo;
        string ipfsImageHash; // hash de la foto real de la planta
        string ipfsVideoHash; // hash del video (opcional)
        bool tieneVideo;
    }

    // ─── Mappings ─────────────────────────────────────────────
    mapping(uint256 => MetadataNFT) public metadataTokens;
    mapping(uint256 => uint256) public plantaAToken; // idPlanta → tokenId
    mapping(address => uint256[]) public tokensDeWallet; // wallet → lista de tokenIds

    // ─── Eventos ──────────────────────────────────────────────
    event NFTAcunado(
        uint256 indexed tokenId,
        uint256 indexed idPlanta,
        address indexed propietario,
        string especie,
        string ipfsImageHash,
        uint256 timestamp
    );
    event VideoAgregado(uint256 indexed tokenId, string ipfsVideoHash);
    event ViveroContratoActualizado(address nuevoContrato);

    // ─── Modificadores ────────────────────────────────────────
    modifier soloDesdVivero() {
        require(
            msg.sender == viveroContrato || msg.sender == owner(),
            "Solo el contrato Vivero o el owner pueden acunar NFTs"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────
    // ✅ CORREGIDO OZ v5: Ownable ahora requiere pasar el owner en el constructor
    constructor(
        address _viveroContrato
    ) ERC721("Certificado Conservacion Paramo", "PARAMO") Ownable(msg.sender) {
        viveroContrato = _viveroContrato;
    }

    // ─────────────────────────────────────────────────────────
    //  ACUÑAR NFT
    //  Llamado desde el frontend cuando el usuario toma la foto
    //  y presiona "Crear NFT con esta foto"
    //
    //  Parámetros:
    //   _propietario   → wallet del responsable del traslado
    //   _tokenURI      → URI de IPFS con el JSON de metadata
    //                    ej: ipfs://QmXxx.../metadata.json
    //   _idPlanta      → ID de la planta en Vivero
    //   _idSemilla     → ID de la semilla original
    //   _especie       → "Frailejon", "Cardones", etc.
    //   _responsable   → nombre del responsable
    //   _latitud       → coordenada × 1_000_000
    //   _longitud      → coordenada × 1_000_000
    //   _temperatura   → temperatura × 10
    //   _humedad       → porcentaje 0-100
    //   _altitud       → metros sobre el nivel del mar
    //   _ipfsImageHash → hash IPFS de la foto real (ej: "QmXxx...")
    // ─────────────────────────────────────────────────────────

    function acunarNFT(
        address _propietario,
        string memory _tokenURI,
        uint256 _idPlanta,
        uint256 _idSemilla,
        string memory _especie,
        string memory _responsable,
        int256 _latitud,
        int256 _longitud,
        int256 _temperatura,
        uint256 _humedad,
        uint256 _altitud,
        string memory _ipfsImageHash
    ) external soloDesdVivero returns (uint256) {
        // Verificar que la planta no tenga NFT ya
        require(
            plantaAToken[_idPlanta] == 0,
            "Esta planta ya tiene un NFT acunado"
        );

        // ✅ CORREGIDO: contador manual en lugar de _tokenIds.increment()
        // Antes: _tokenIds.increment(); uint256 nuevoTokenId = _tokenIds.current();
        // Ahora:
        _tokenIdActual++;
        uint256 nuevoTokenId = _tokenIdActual;

        // Acuñar el NFT al propietario
        _safeMint(_propietario, nuevoTokenId);

        // Asignar la URI de metadata (apunta al JSON en IPFS)
        _setTokenURI(nuevoTokenId, _tokenURI);

        // Guardar metadata on-chain
        metadataTokens[nuevoTokenId] = MetadataNFT({
            tokenId: nuevoTokenId,
            idPlanta: _idPlanta,
            idSemilla: _idSemilla,
            especie: _especie,
            responsable: _responsable,
            latitud: _latitud,
            longitud: _longitud,
            temperatura: _temperatura,
            humedad: _humedad,
            altitud: _altitud,
            fechaMinteo: block.timestamp,
            ipfsImageHash: _ipfsImageHash,
            ipfsVideoHash: "",
            tieneVideo: false
        });

        // Indexar para búsquedas rápidas
        plantaAToken[_idPlanta] = nuevoTokenId;
        tokensDeWallet[_propietario].push(nuevoTokenId);

        emit NFTAcunado(
            nuevoTokenId,
            _idPlanta,
            _propietario,
            _especie,
            _ipfsImageHash,
            block.timestamp
        );

        return nuevoTokenId;
    }

    // ─────────────────────────────────────────────────────────
    //  AGREGAR VIDEO AL NFT
    //  El video se sube a IPFS por separado y se vincula al NFT
    //  existente. Solo el propietario del token puede agregarlo.
    // ─────────────────────────────────────────────────────────

    function agregarVideo(
        uint256 _tokenId,
        string memory _ipfsVideoHash
    ) external {
        require(
            ownerOf(_tokenId) == msg.sender,
            "No eres el propietario de este NFT"
        );
        require(bytes(_ipfsVideoHash).length > 0, "Hash de video vacio");

        metadataTokens[_tokenId].ipfsVideoHash = _ipfsVideoHash;
        metadataTokens[_tokenId].tieneVideo = true;

        emit VideoAgregado(_tokenId, _ipfsVideoHash);
    }

    // ─── Consultas ────────────────────────────────────────────

    /// Total de NFTs acuñados
    function totalNFTs() external view returns (uint256) {
        // ✅ CORREGIDO: _tokenIdActual en lugar de _tokenIds.current()
        return _tokenIdActual;
    }

    /// Obtener metadata completa de un token
    function obtenerMetadata(
        uint256 _tokenId
    ) external view returns (MetadataNFT memory) {
        // ✅ CORREGIDO: _tokenIdActual en lugar de _tokenIds.current()
        require(_tokenId > 0 && _tokenId <= _tokenIdActual, "Token no existe");
        return metadataTokens[_tokenId];
    }

    /// Obtener el tokenId de una planta (0 si no tiene NFT)
    function obtenerTokenDePlanta(
        uint256 _idPlanta
    ) external view returns (uint256) {
        return plantaAToken[_idPlanta];
    }

    /// Obtener todos los NFTs de una wallet
    function obtenerTokensDeWallet(
        address _wallet
    ) external view returns (uint256[] memory) {
        return tokensDeWallet[_wallet];
    }

    /// ¿Esta planta ya tiene un NFT?
    function plantaTieneNFT(uint256 _idPlanta) external view returns (bool) {
        return plantaAToken[_idPlanta] != 0;
    }

    // ─── Administración ───────────────────────────────────────

    function actualizarViveroContrato(
        address _nuevoContrato
    ) external onlyOwner {
        viveroContrato = _nuevoContrato;
        emit ViveroContratoActualizado(_nuevoContrato);
    }
}
