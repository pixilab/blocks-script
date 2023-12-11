# blocks-script
Scripting support for use with PIXILAB Blocks®, including custom device drivers.

Learn now to install and use drivers on your Blocks system here:
https://pixilab.se/docs/blocks/drivers/concepts#using_a_device_driver

For more details on drivers and scripting development, see
https://pixilab.se/docs/blocks/drivers  
https://pixilab.se/docs/blocks/advanced_scripting

### Additional Preparations for Development
If you plan on doing development of drivers/scripts, there's an additional step required after cloning/downloading/installing these files. You must then also run the *npm install* command from within the *script* directory to download and install any development dependencies, as specified by the package.json file. If such dependencies are not installed, you may get TypeScript compilation errors.
